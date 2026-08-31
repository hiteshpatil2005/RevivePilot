import uuid
from typing import Optional, List, Tuple
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.transaction import Transaction
from app.models.customer import Customer


class TransactionService:
    @staticmethod
    async def list_transactions(
        session: AsyncSession,
        merchant_id: uuid.UUID,
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Transaction], int]:
        """
        List transactions strictly scoped to the authenticated merchant.
        """
        query = (
            select(Transaction)
            .options(joinedload(Transaction.customer))
            .where(Transaction.merchant_id == merchant_id)
        )

        if status and status.upper() != "ALL":
            query = query.where(Transaction.status == status.upper())

        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.join(Transaction.customer).where(
                (Transaction.external_payment_id.ilike(search_pattern))
                | (Customer.name.ilike(search_pattern))
                | (Customer.email.ilike(search_pattern))
            )

        # Count total matching
        count_query = select(func.count()).select_from(query.subquery())
        total = await session.scalar(count_query) or 0

        # Pagination & ordering
        query = query.order_by(Transaction.created_at.desc())
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        result = await session.execute(query)
        transactions = list(result.scalars().unique().all())

        return transactions, total

    @staticmethod
    async def get_by_id(
        session: AsyncSession,
        transaction_id: uuid.UUID,
        merchant_id: uuid.UUID,
    ) -> Transaction:
        """
        Fetch a single transaction with merchant ownership verification.
        """
        query = (
            select(Transaction)
            .options(joinedload(Transaction.customer))
            .where(
                Transaction.id == transaction_id,
                Transaction.merchant_id == merchant_id,
            )
        )
        res = await session.execute(query)
        transaction = res.scalars().first()

        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )
        return transaction
