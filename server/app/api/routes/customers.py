import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.customer import CustomerResponse, CustomerListResponse
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])


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
