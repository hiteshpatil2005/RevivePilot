import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.customer import (
    CustomerResponse,
    CustomerListResponse,
    CustomerPortalRegisterRequest,
    CustomerPortalVerifyRequest,
)
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])


# ── Customer Portal Authentication & Registration Endpoints ──────────────────
@router.post("/portal/register")
async def register_portal_customer(
    payload: CustomerPortalRegisterRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Public portal registration for Acme Cloud Store users.
    Dispatches 6-digit OTP verification email and assigns unique payment instruments.
    """
    return await CustomerService.register_portal_customer(
        session=session,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
    )


@router.post("/portal/verify", response_model=CustomerResponse)
async def verify_portal_customer(
    payload: CustomerPortalVerifyRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Verifies 6-digit OTP code sent to user email and activates dynamic customer account.
    """
    return await CustomerService.verify_portal_customer(
        session=session,
        email=payload.email,
        code=payload.code,
    )


@router.get("/portal/me", response_model=CustomerResponse)
async def get_portal_customer(
    email: str = Query(..., description="Customer email address"),
    session: AsyncSession = Depends(get_db),
):
    """
    Fetches active customer profile with unique assigned payment instruments.
    """
    return await CustomerService.get_portal_customer(
        session=session,
        email=email,
    )


# ── Merchant Admin Scoped Endpoints ──────────────────────────────────────────
@router.get("", response_model=CustomerListResponse)
async def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    List customers belonging strictly to the authenticated merchant.
    Supports text search across name, email, phone, and external ID.
    """
    customers, total = await CustomerService.list_customers(
        session=session,
        merchant_id=current_user.merchant_id,
        page=page,
        limit=limit,
        search=search,
    )
    return CustomerListResponse(
        customers=customers,
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieve single customer by UUID strictly scoped to the authenticated merchant.
    """
    return await CustomerService.get_by_id(
        session=session,
        customer_id=customer_id,
        merchant_id=current_user.merchant_id,
    )
