from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Retrieve database-derived financial metrics and recovery realization for the merchant.
    """
    return await AnalyticsService.get_overview(session, current_user.merchant_id)


@router.get("/metrics")
async def get_analytics_metrics(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Retrieve granular revenue recovery performance indicators for the merchant.
    """
    return await AnalyticsService.get_dashboard_metrics(session, current_user.merchant_id)
