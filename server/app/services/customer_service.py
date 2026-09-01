import uuid
from typing import List, Tuple, Optional
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.customer import Customer
from app.schemas.customer import CustomerResponse, CustomerCreate, CustomerUpdate


class CustomerService:
    @staticmethod
    def _format_customer(c: Customer) -> CustomerResponse:
        return CustomerResponse(
            id=c.id,
            merchant_id=c.merchant_id,
            merchantId=c.merchant_id,
            name=c.name,
            email=c.email,
            phone=c.phone,
            external_customer_id=c.external_customer_id,
            externalCustomerId=c.external_customer_id,
            created_at=c.created_at,
            createdAt=c.created_at,
            updated_at=c.updated_at,
            updatedAt=c.updated_at,
        )

    @staticmethod
    async def list_customers(
        session: AsyncSession,
        merchant_id: uuid.UUID,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
    ) -> Tuple[List[CustomerResponse], int]:
        """
        List customers scoped strictly to merchant_id with search and pagination.
        """
        query = select(Customer).where(Customer.merchant_id == merchant_id)

        if search:
            s_term = f"%{search}%"
            query = query.where(
                or_(
                    Customer.name.ilike(s_term),
                    Customer.email.ilike(s_term),
                    Customer.phone.ilike(s_term),
                    Customer.external_customer_id.ilike(s_term),
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = await session.scalar(count_query) or 0

        query = query.order_by(Customer.created_at.desc())
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        result = await session.execute(query)
        customers = list(result.scalars().all())

        return [CustomerService._format_customer(c) for c in customers], total

    @staticmethod
    async def get_by_id(
        session: AsyncSession,
        customer_id: uuid.UUID,
        merchant_id: uuid.UUID,
    ) -> CustomerResponse:
        """
        Get single customer by ID with merchant scoping.
        """
        query = select(Customer).where(
            Customer.id == customer_id,
            Customer.merchant_id == merchant_id,
        )
        result = await session.execute(query)
        customer = result.scalars().first()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer '{customer_id}' not found.",
            )
        return CustomerService._format_customer(customer)
