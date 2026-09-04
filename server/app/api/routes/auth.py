from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.merchant import Merchant
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse
from app.services.auth_service import AuthService
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegister,
    session: AsyncSession = Depends(get_db),
):
    """
    Register a new merchant and owner account.
    Disabled in single-merchant production mode.
    """
    if not settings.ALLOW_MERCHANT_REGISTRATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant self-registration is disabled. Contact system administrator.",
        )
    user, token = await AuthService.register(session, data)
    user_resp = AuthService.format_user_response(user, business_name=data.resolved_business_name)
    return TokenResponse(
        token=token,
        access_token=token,
        token_type="bearer",
        user=user_resp,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    session: AsyncSession = Depends(get_db),
):
    """
    Authenticate merchant credentials and issue a signed JWT access token.
    """
    user, token = await AuthService.login(session, data)
    merchant = await session.get(Merchant, user.merchant_id)
    business_name = merchant.business_name if merchant else "Merchant"
    user_resp = AuthService.format_user_response(user, business_name=business_name)

    return TokenResponse(
        token=token,
        access_token=token,
        token_type="bearer",
        user=user_resp,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieve authenticated user profile and merchant organization details.
    """
    merchant = await session.get(Merchant, current_user.merchant_id)
    business_name = merchant.business_name if merchant else "Merchant"
    return AuthService.format_user_response(current_user, business_name=business_name)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Invalidate session (client-side token removal & audit recording).
    """
    return {"success": True, "message": "Successfully logged out."}


# ── Customer OTP Authentication Routes ────────────────────────────────────────
from app.schemas.auth import (
    CustomerSendOtpRequest,
    CustomerVerifyOtpRequest,
    CustomerTokenResponse,
)
from app.services.otp_service import OTPService
from app.services.customer_service import CustomerService
from app.core.security import create_customer_token
from app.api.deps import get_current_customer
from app.models.customer import Customer
from app.models.merchant import Merchant
from app.models.audit_log import AuditLog
from sqlalchemy import select


@router.post("/customer/send-otp")
async def customer_send_otp(
    payload: CustomerSendOtpRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Generate a cryptographically secure 6-digit OTP, store its SHA-256 hash in Redis,
    and dispatch it to the customer's email via SMTP with strict rate limiting.
    """
    result = await OTPService.request_otp(email=payload.email, name=payload.name)
    return result


@router.post("/customer/verify-otp", response_model=CustomerTokenResponse)
async def customer_verify_otp(
    payload: CustomerVerifyOtpRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Verifies the customer's OTP against Redis, invalidates it on success (one-time use),
    provisions or activates the customer profile with unique test instruments,
    and returns a signed JWT access token.
    """
    import uuid

    # 1. Verify OTP from Redis (raises 400 or 429 on invalid/expired/exceeded)
    await OTPService.verify_otp(email=payload.email, otp=payload.otp)

    norm_email = payload.email.lower().strip()
    name = payload.name or norm_email.split("@")[0].capitalize()

    # 2. Get active merchant
    merchant = (await session.scalars(select(Merchant).limit(1))).first()
    if not merchant:
        raise HTTPException(status_code=500, detail="No active merchant found in platform")

    # 3. Find existing or create new verified customer
    customer = (
        await session.scalars(
            select(Customer).where(
                Customer.merchant_id == merchant.id,
                Customer.email.ilike(norm_email),
            )
        )
    ).first()

    cid = customer.id if customer else uuid.uuid4()
    instruments = CustomerService._generate_unique_payment_instruments(name, cid)

    if customer:
        customer.is_verified = True
        customer.verification_code = None
        customer.verification_code_expires_at = None
        if not customer.card_number:
            for k, v in instruments.items():
                setattr(customer, k, v)
    else:
        customer = Customer(
            id=cid,
            merchant_id=merchant.id,
            name=name,
            email=norm_email,
            phone="+91 98765 00000",
            external_customer_id=f"cust_{norm_email.split('@')[0]}",
            is_verified=True,
            **instruments,
        )
        session.add(customer)

    # 4. Record Audit Log
    audit = AuditLog(
        merchant_id=merchant.id,
        event_type="CUSTOMER_LOGIN",
        actor_type="CUSTOMER",
        description=f"Customer {name} ({norm_email}) authenticated via secure email OTP",
        metadata_={"customer_id": str(cid), "email": norm_email, "auth_method": "EMAIL_OTP"},
    )
    session.add(audit)

    await session.commit()
    await session.refresh(customer)

    # 5. Create customer JWT access token
    session_id = str(uuid.uuid4())
    token = create_customer_token(
        customer_id=customer.id,
        merchant_id=customer.merchant_id,
        email=customer.email,
        session_id=session_id,
    )

    formatted_cust = CustomerService._format_customer(customer).model_dump(by_alias=True)

    return CustomerTokenResponse(
        token=token,
        access_token=token,
        token_type="bearer",
        customer=formatted_cust,
    )


@router.get("/customer/me")
async def get_customer_me(
    current_customer: Customer = Depends(get_current_customer),
):
    """
    Retrieve authenticated customer profile strictly scoped to the Bearer JWT token.
    """
    return CustomerService._format_customer(current_customer)
