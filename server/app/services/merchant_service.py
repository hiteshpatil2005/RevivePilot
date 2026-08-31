import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.merchant import Merchant
from app.schemas.merchant import MerchantUpdate


class MerchantService:
    @staticmethod
    async def get_by_id(session: AsyncSession, merchant_id: uuid.UUID) -> Merchant:
        merchant = await session.get(Merchant, merchant_id)
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant not found",
            )
        return merchant

    @staticmethod
    async def update(session: AsyncSession, merchant_id: uuid.UUID, data: MerchantUpdate) -> Merchant:
        merchant = await MerchantService.get_by_id(session, merchant_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(merchant, field, value)
        await session.flush()
        return merchant
