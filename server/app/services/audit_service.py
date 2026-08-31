import uuid
from datetime import datetime
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogCreate, AuditLogResponse


class AuditService:
    @staticmethod
    async def create_log(
        session: AsyncSession,
        merchant_id: uuid.UUID,
        event_type: str,
        description: str,
        actor_type: str = "SYSTEM",
        user_id: Optional[uuid.UUID] = None,
        recovery_case_id: Optional[uuid.UUID] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Create an immutable audit log record."""
        log_entry = AuditLog(
            merchant_id=merchant_id,
            user_id=user_id,
            recovery_case_id=recovery_case_id,
            event_type=event_type,
            actor_type=actor_type,
            description=description,
            metadata_=metadata or {},
        )
        session.add(log_entry)
        await session.flush()
        return log_entry

    @staticmethod
    def _format_log(log: AuditLog) -> AuditLogResponse:
        case_str = str(log.recovery_case_id) if log.recovery_case_id else "—"
        result_val = "FAILED" if ("FAILED" in log.event_type or "BLOCKED" in log.event_type) else "SUCCESS"

        return AuditLogResponse(
            id=log.id,
            merchant_id=log.merchant_id,
            user_id=log.user_id,
            recovery_case_id=log.recovery_case_id,
            event_type=log.event_type,
            eventType=log.event_type,
            actor_type=log.actor_type,
            actor=log.actor_type,
            action=log.event_type.replace("_", " ").title(),
            description=log.description,
            detail=log.description,
            result=result_val,
            decision=f"Event: {log.event_type}",
            reason=log.description,
            caseId=case_str,
            metadata=log.metadata_,
            timestamp=log.created_at,
            created_at=log.created_at,
        )

    @staticmethod
    async def list_logs(
        session: AsyncSession,
        merchant_id: uuid.UUID,
        page: int = 1,
        limit: int = 50,
        event_type: Optional[str] = None,
        recovery_case_id: Optional[uuid.UUID] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Tuple[List[AuditLogResponse], int]:
        """List audit logs strictly scoped to the authenticated merchant."""
        query = select(AuditLog).where(AuditLog.merchant_id == merchant_id)

        if event_type and event_type.upper() != "ALL":
            query = query.where(AuditLog.event_type == event_type.upper())

        if recovery_case_id:
            query = query.where(AuditLog.recovery_case_id == recovery_case_id)

        if date_from:
            query = query.where(AuditLog.created_at >= date_from)

        if date_to:
            query = query.where(AuditLog.created_at <= date_to)

        count_query = select(func.count()).select_from(query.subquery())
        total = await session.scalar(count_query) or 0

        query = query.order_by(AuditLog.created_at.desc())
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        result = await session.execute(query)
        logs = list(result.scalars().all())

        formatted = [AuditService._format_log(l) for l in logs]
        return formatted, total
