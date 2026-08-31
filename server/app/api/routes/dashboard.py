from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get live revenue recovery KPIs aggregated from PostgreSQL for the merchant dashboard.
    Strictly isolated to current merchant.
    """
    return await AnalyticsService.get_dashboard_metrics(session, current_user.merchant_id)


@router.get("/live-activity")
async def get_dashboard_activity(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Get recent live recovery events for the dashboard activity feed.
    """
    from app.services.audit_service import AuditService
    logs, _ = await AuditService.list_logs(session, current_user.merchant_id, page=1, limit=10)
    return logs
