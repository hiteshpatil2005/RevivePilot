import uuid
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.merchant import Merchant
from app.models.user import User, UserRole
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.logging import logger


class AuthService:
    @staticmethod
    async def register(session: AsyncSession, data: UserRegister) -> Tuple[User, str]:
        """
        Atomically register a new merchant and its initial OWNER user.
        """
        # Check if email is already taken
        query = select(User).where(User.email == data.email)
        res = await session.execute(query)
        if res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address already exists.",
            )

        # 1. Create Merchant
        merchant = Merchant(
            name=data.resolved_business_name,
            email=data.email,
            business_name=data.resolved_business_name,
            currency="INR",
            timezone="Asia/Kolkata",
            status="ACTIVE",
        )
        session.add(merchant)
        await session.flush()  # Populates merchant.id

        # 2. Create Initial Owner User
        hashed_password = get_password_hash(data.password)
        user = User(
            merchant_id=merchant.id,
            name=data.resolved_name,
            email=data.email,
            password_hash=hashed_password,
            role=UserRole.OWNER.value,
            status="ACTIVE",
        )
        session.add(user)
        await session.flush()  # Populates user.id

        # Generate JWT token
        token = create_access_token(
            subject=user.id,
            merchant_id=merchant.id,
            role=user.role,
        )

        logger.info(f"Registered new merchant {merchant.id} and user {user.id} ({user.email})")
        return user, token

    @staticmethod
    async def login(session: AsyncSession, data: UserLogin) -> Tuple[User, str]:
        """
        Authenticate user credentials and generate JWT token.
        """
        query = select(User).where(User.email == data.email)
        res = await session.execute(query)
        user = res.scalars().first()

        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if user.status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated.",
            )

        token = create_access_token(
            subject=user.id,
            merchant_id=user.merchant_id,
            role=user.role,
        )

        logger.info(f"User {user.id} logged in successfully")
        return user, token

    @staticmethod
    def format_user_response(user: User, business_name: Optional[str] = None) -> UserResponse:
        """Format User model into UserResponse with initials and computed properties."""
        initials = "".join([n[0] for n in user.name.split() if n])[:2].upper() or "RP"
        return UserResponse(
            id=user.id,
            merchant_id=user.merchant_id,
            name=user.name,
            fullName=user.name,
            email=user.email,
            role=user.role,
            status=user.status,
            businessName=business_name or "Merchant",
            avatarInitials=initials,
            plan="Growth",
        )
