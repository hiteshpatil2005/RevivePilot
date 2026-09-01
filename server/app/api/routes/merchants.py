from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.merchant import MerchantResponse, MerchantUpdate
from app.services.merchant_service import MerchantService

router = APIRouter(prefix="/merchants", tags=["Merchants"])


@router.get("/current", response_model=MerchantResponse)
@router.get("/me", response_model=MerchantResponse)
async def get_current_merchant(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Retrieve details of the authenticated merchant organization."""
    return await MerchantService.get_by_id(session, current_user.merchant_id)


@router.put("/current", response_model=MerchantResponse)
@router.put("/me", response_model=MerchantResponse)
async def update_current_merchant(
    data: MerchantUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Update settings of the authenticated merchant organization."""
    return await MerchantService.update(session, current_user.merchant_id, data)
