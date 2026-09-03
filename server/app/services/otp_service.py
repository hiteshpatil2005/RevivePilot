import time
import hashlib
import secrets
import asyncio
from typing import Tuple, Optional, Dict, Any
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logging import logger
from app.events.publisher import get_redis_client
from app.services.email_service import EmailService

# Thread-safe in-memory cache fallback for isolated unit tests / SQLite runs
_in_memory_cache: Dict[str, Any] = {}
_background_tasks = set()


class OTPService:
    """
    Cryptographically secure OTP service backed by Redis with in-memory test fallback.
    Enforces SHA-256 hashing, 5-minute expiration, 60s cooldown,
    attempt limits, and one-time use invalidation.
    """

    @staticmethod
    def _hash_otp(email: str, otp: str) -> str:
        """Derives a salted SHA-256 hash for OTP storage in Redis."""
        salt = settings.JWT_SECRET_KEY[:16]
        return hashlib.sha256(f"{salt}:{email.lower().strip()}:{otp.strip()}".encode("utf-8")).hexdigest()

    @staticmethod
    async def request_otp(email: str, name: Optional[str] = None) -> dict:
        """
        Generates and securely dispatches a 6-digit OTP.
        Stores SHA-256 hash in Redis with TTL.
        """
        norm_email = email.lower().strip()
        cooldown_key = f"revivepilot:otp_cooldown:{norm_email}"
        otp_key = f"revivepilot:otp:{norm_email}"
        attempts_key = f"revivepilot:otp_attempts:{norm_email}"

        redis = await get_redis_client()
        now = time.time()

        # 1. Check resend cooldown
        if redis:
            try:
                is_cooldown = await redis.get(cooldown_key)
                if is_cooldown:
                    ttl = await redis.ttl(cooldown_key)
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Please wait {max(1, ttl)} seconds before requesting another verification code.",
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"[OTPService] Redis error on cooldown check: {e}")
        else:
            # In-memory check
            cooldown_exp = _in_memory_cache.get(cooldown_key, 0)
            if cooldown_exp > now:
                remaining = int(cooldown_exp - now)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {max(1, remaining)} seconds before requesting another verification code.",
                )

        # 2. Generate cryptographically secure 6-digit OTP
        raw_otp = f"{secrets.randbelow(900000) + 100000}"
        otp_hash = OTPService._hash_otp(norm_email, raw_otp)

        # 3. Store in Redis / cache
        if redis:
            try:
                await redis.set(otp_key, otp_hash, ex=settings.OTP_EXPIRE_SECONDS)
                await redis.set(cooldown_key, "1", ex=settings.OTP_COOLDOWN_SECONDS)
                await redis.set(attempts_key, "0", ex=settings.OTP_EXPIRE_SECONDS)
            except Exception as e:
                logger.warning(f"[OTPService] Redis storage failed, falling back to memory: {e}")
                _in_memory_cache[otp_key] = {"hash": otp_hash, "exp": now + settings.OTP_EXPIRE_SECONDS}
                _in_memory_cache[cooldown_key] = now + settings.OTP_COOLDOWN_SECONDS
                _in_memory_cache[attempts_key] = 0
        else:
            _in_memory_cache[otp_key] = {"hash": otp_hash, "exp": now + settings.OTP_EXPIRE_SECONDS}
            _in_memory_cache[cooldown_key] = now + settings.OTP_COOLDOWN_SECONDS
            _in_memory_cache[attempts_key] = 0

        # 4. Dispatch via Email Service asynchronously (instant <50ms response to client)
        task = asyncio.create_task(
            EmailService.send_customer_otp(
                email=norm_email,
                otp=raw_otp,
                name=name,
            )
        )
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

        logger.info(f"[OTPService] OTP generated and hash stored for customer {norm_email}")

        return {
            "success": True,
            "message": f"Verification code sent to {norm_email}",
            "expiresInSeconds": settings.OTP_EXPIRE_SECONDS,
            "deliveryMode": "DISPATCHED",
        }

    @staticmethod
    async def verify_otp(email: str, otp: str) -> bool:
        """
        Verifies customer OTP against hashed value stored in Redis.
        Invalidates on success or enforces max-attempt lockouts.
        """
        norm_email = email.lower().strip()
        otp_key = f"revivepilot:otp:{norm_email}"
        attempts_key = f"revivepilot:otp_attempts:{norm_email}"
        cooldown_key = f"revivepilot:otp_cooldown:{norm_email}"

        redis = await get_redis_client()
        stored_hash = None
        attempts = 0
        now = time.time()

        if redis:
            try:
                stored_hash = await redis.get(otp_key)
                attempts_raw = await redis.get(attempts_key)
                attempts = int(attempts_raw) if attempts_raw else 0
            except Exception as e:
                logger.warning(f"[OTPService] Redis retrieval error: {e}")

        if not stored_hash and otp_key in _in_memory_cache:
            entry = _in_memory_cache[otp_key]
            if entry["exp"] > now:
                stored_hash = entry["hash"]
            attempts = _in_memory_cache.get(attempts_key, 0)

        # 1. Check if OTP exists
        if not stored_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired or does not exist. Please request a new code.",
            )

        # 2. Check attempt limits
        if attempts >= settings.OTP_MAX_ATTEMPTS:
            if redis:
                await redis.delete(otp_key)
                await redis.delete(attempts_key)
            _in_memory_cache.pop(otp_key, None)
            _in_memory_cache.pop(attempts_key, None)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Maximum verification attempts exceeded. For your security, this code has been invalidated.",
            )

        # 3. Verify hash using constant-time comparison
        input_hash = OTPService._hash_otp(norm_email, otp)
        if not secrets.compare_digest(stored_hash, input_hash):
            attempts += 1
            if redis:
                try:
                    await redis.incr(attempts_key)
                except Exception:
                    pass
            _in_memory_cache[attempts_key] = attempts
            remaining = max(0, settings.OTP_MAX_ATTEMPTS - attempts)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification code. {remaining} attempt(s) remaining.",
            )

        # 4. Success: Invalidate OTP immediately (one-time use)
        if redis:
            try:
                await redis.delete(otp_key)
                await redis.delete(attempts_key)
                await redis.delete(cooldown_key)
            except Exception:
                pass
        _in_memory_cache.pop(otp_key, None)
        _in_memory_cache.pop(attempts_key, None)
        _in_memory_cache.pop(cooldown_key, None)

        logger.info(f"[OTPService] OTP successfully verified and invalidated for {norm_email}")
        return True
