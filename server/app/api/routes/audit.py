import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.audit import AuditLogResponse
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=PaginatedResponse[AuditLogResponse])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    event_type: Optional[str] = Query(None),
    recovery_case_id: Optional[uuid.UUID] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    List immutable audit records strictly scoped to the authenticated merchant.
    """
    items, total = await AuditService.list_logs(
        session=session,
        merchant_id=current_user.merchant_id,
        page=page,
        limit=limit,
        event_type=event_type,
        recovery_case_id=recovery_case_id,
        date_from=date_from,
        date_to=date_to,
    )
    pages = (total + limit - 1) // limit if total > 0 else 1

    return PaginatedResponse(
        items=items,
        pagination=PaginationMeta(page=page, limit=limit, total=total, pages=pages),
    )
