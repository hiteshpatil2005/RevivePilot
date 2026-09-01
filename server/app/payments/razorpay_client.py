import hmac
import hashlib
import uuid
from decimal import Decimal
from typing import Dict, Any, Optional
import httpx

from app.core.config import settings
from app.core.logging import logger


class RazorpayClient:
    """
    Razorpay Test Mode Gateway Client.
    Handles cryptographic HMAC-SHA256 webhook signature verification,
    order generation, and smart recovery payment links.
    """

    BASE_URL = "https://api.razorpay.com/v1"

    @classmethod
    def verify_webhook_signature(
        cls,
        payload_bytes: bytes,
        signature: str,
        secret: Optional[str] = None,
    ) -> bool:
        """
        Cryptographically verifies the Razorpay webhook signature header (`X-Razorpay-Signature`).
        Computes HMAC-SHA256 of the raw body against the webhook secret.
        """
        if not signature:
            return False

        webhook_secret = secret or settings.RAZORPAY_WEBHOOK_SECRET
        expected_signature = hmac.new(
            key=webhook_secret.encode("utf-8"),
            msg=payload_bytes,
            digestmod=hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)

    @classmethod
    def generate_signature(
        cls,
        payload_bytes: bytes,
        secret: Optional[str] = None,
    ) -> str:
        """Helper to generate a valid HMAC-SHA256 signature for test/simulation payloads."""
        webhook_secret = secret or settings.RAZORPAY_WEBHOOK_SECRET
        return hmac.new(
            key=webhook_secret.encode("utf-8"),
            msg=payload_bytes,
            digestmod=hashlib.sha256,
        ).hexdigest()

    @classmethod
    async def create_order(
        cls,
        amount: Decimal,
        currency: str = "INR",
        receipt: Optional[str] = None,
        notes: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Creates a test order in Razorpay.
        Amount is converted to paise (1 INR = 100 paise).
        """
        amount_paise = int(amount * 100)
        order_receipt = receipt or f"rcpt_{uuid.uuid4().hex[:12]}"

        # Check if live credentials are configured
        if settings.RAZORPAY_KEY_ID != "rzp_test_mock" and settings.RAZORPAY_KEY_SECRET != "mock_secret":
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(
                        f"{cls.BASE_URL}/orders",
                        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                        json={
                            "amount": amount_paise,
                            "currency": currency,
                            "receipt": order_receipt,
                            "notes": notes or {},
                        },
                    )
                    if res.status_code in [200, 201]:
                        return res.json()
                    logger.warning(f"Razorpay API order error ({res.status_code}): {res.text}")
            except Exception as e:
                logger.warning(f"Razorpay API connection error: {e}")

        # High-fidelity sandbox fallback
        return {
            "id": f"order_{uuid.uuid4().hex[:14]}",
            "entity": "order",
            "amount": amount_paise,
            "amount_paid": 0,
            "amount_due": amount_paise,
            "currency": currency,
            "receipt": order_receipt,
            "status": "created",
            "attempts": 0,
            "notes": notes or {},
            "created_at": 1756700000,
        }

    @classmethod
    async def create_payment_link(
        cls,
        amount: Decimal,
        currency: str = "INR",
        description: str = "Autonomous Revenue Recovery Payment",
        customer_name: Optional[str] = None,
        customer_email: Optional[str] = None,
        customer_phone: Optional[str] = None,
        case_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a Razorpay Smart Alternative Payment Link for autonomous recovery.
        """
        amount_paise = int(amount * 100)
        link_id = f"plink_{uuid.uuid4().hex[:14]}"
        short_url = f"https://rzp.io/i/{link_id[:8]}"

        payload = {
            "amount": amount_paise,
            "currency": currency,
            "accept_partial": False,
            "description": description,
            "customer": {
                "name": customer_name or "Customer",
                "email": customer_email or "customer@example.com",
                "contact": customer_phone or "+919876543210",
            },
            "notify": {"sms": True, "email": True},
            "reminder_enable": True,
            "notes": {"case_id": case_id or "—", "platform": "RevivePilot"},
        }

        if settings.RAZORPAY_KEY_ID != "rzp_test_mock" and settings.RAZORPAY_KEY_SECRET != "mock_secret":
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(
                        f"{cls.BASE_URL}/payment_links",
                        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                        json=payload,
                    )
                    if res.status_code in [200, 201]:
                        return res.json()
            except Exception as e:
                logger.warning(f"Razorpay payment link error: {e}")

        # Realistic sandbox response
        return {
            "id": link_id,
            "entity": "payment_link",
            "amount": amount_paise,
            "currency": currency,
            "status": "created",
            "short_url": short_url,
            "description": description,
            "customer": payload["customer"],
            "notes": payload["notes"],
        }
