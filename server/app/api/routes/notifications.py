import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationResponse, NotificationListResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False, alias="unreadOnly"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    List notifications for the authenticated merchant with unread count.
    """
    notifications, unread_count, total = await NotificationService.list_notifications(
        session=session,
        merchant_id=current_user.merchant_id,
        user_id=current_user.id,
        page=page,
        limit=limit,
        unread_only=unread_only,
    )
    return NotificationListResponse(
        notifications=notifications,
        unreadCount=unread_count,
        total=total,
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Mark an individual notification as read.
    """
    return await NotificationService.mark_as_read(
        session=session,
        notification_id=notification_id,
        merchant_id=current_user.merchant_id,
    )


@router.patch("/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Mark all unread notifications as read for the authenticated merchant.
    """
    count = await NotificationService.mark_all_as_read(
        session=session,
        merchant_id=current_user.merchant_id,
        user_id=current_user.id,
    )
    return {"success": True, "updated": count}
