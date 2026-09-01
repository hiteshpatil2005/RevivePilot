import uuid
from typing import List, Tuple, Optional
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.notification import Notification
from app.schemas.notification import NotificationResponse


class NotificationService:
    @staticmethod
    def _format_notification(n: Notification) -> NotificationResponse:
        return NotificationResponse(
            id=n.id,
            merchant_id=n.merchant_id,
            merchantId=n.merchant_id,
            user_id=n.user_id,
            userId=n.user_id,
            type=n.type,
            title=n.title,
            message=n.message,
            read=n.read,
            metadata=n.metadata_ or {},
            created_at=n.created_at,
            createdAt=n.created_at,
        )

    @staticmethod
    async def list_notifications(
        session: AsyncSession,
        merchant_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
        page: int = 1,
        limit: int = 20,
        unread_only: bool = False,
    ) -> Tuple[List[NotificationResponse], int, int]:
        """
        List notifications scoped strictly to merchant and calculate unread count.
        """
        base_query = select(Notification).where(Notification.merchant_id == merchant_id)
        if unread_only:
            base_query = base_query.where(Notification.read == False)

        count_query = select(func.count()).select_from(base_query.subquery())
        total = await session.scalar(count_query) or 0

        # Calculate total unread count for merchant
        unread_query = select(func.count()).where(
            Notification.merchant_id == merchant_id,
            Notification.read == False,
        )
        unread_count = await session.scalar(unread_query) or 0

        query = base_query.order_by(Notification.created_at.desc())
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        result = await session.execute(query)
        notifications = list(result.scalars().all())

        return (
            [NotificationService._format_notification(n) for n in notifications],
            unread_count,
            total,
        )

    @staticmethod
    async def mark_as_read(
        session: AsyncSession,
        notification_id: uuid.UUID,
        merchant_id: uuid.UUID,
    ) -> NotificationResponse:
        """
        Mark single notification as read with merchant isolation.
        """
        query = select(Notification).where(
            Notification.id == notification_id,
            Notification.merchant_id == merchant_id,
        )
        result = await session.execute(query)
        notification = result.scalars().first()
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )

        notification.read = True
        await session.flush()
        return NotificationService._format_notification(notification)

    @staticmethod
    async def mark_all_as_read(
        session: AsyncSession,
        merchant_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
    ) -> int:
        """
        Mark all unread notifications for the merchant as read.
        """
        stmt = (
            update(Notification)
            .where(
                Notification.merchant_id == merchant_id,
                Notification.read == False,
            )
            .values(read=True)
        )
        result = await session.execute(stmt)
        await session.flush()
        return result.rowcount or 0
