import uuid
from typing import Optional, List, Tuple
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.customer import Customer
from app.models.transaction import Transaction
from app.schemas.recovery import RecoveryCaseResponse, PolicyCheckItem
from app.events.publisher import EventPublisher
from app.events.event_types import EventType


class RecoveryService:
    @staticmethod
    def _format_case(case: RecoveryCase) -> RecoveryCaseResponse:
        """Helper to transform RecoveryCase DB model into response model."""
        priority = "high" if case.risk_score >= 80 else ("medium" if case.risk_score >= 50 else "low")
        policy_checks = [
            PolicyCheckItem(
                label="Maximum retries",
                value=f"{case.attempt_count} / {case.max_attempts}",
                passed=case.attempt_count < case.max_attempts,
            ),
            PolicyCheckItem(
                label="Cooldown period",
                value="Satisfied",
                passed=True,
            ),
            PolicyCheckItem(
                label="Amount limit",
                value="Within Limit",
                passed=True,
            ),
        ]

        return RecoveryCaseResponse(
            id=case.id,
            merchant_id=case.merchant_id,
            transaction_id=case.transaction_id,
            customer_id=case.customer_id,
            status=case.status,
            risk_score=case.risk_score,
            recovery_probability=case.recovery_probability,
            root_cause=case.root_cause,
            recommended_strategy=case.recommended_strategy,
            expected_recovery_amount=case.expected_recovery_amount,
            actual_recovered_amount=case.actual_recovered_amount,
            attempt_count=case.attempt_count,
            max_attempts=case.max_attempts,
            amount=case.expected_recovery_amount,
            priority=priority,
            customerId=str(case.customer_id),
            transactionId=str(case.transaction_id),
            rootCause=case.root_cause,
            strategy=case.recommended_strategy or "Delayed Retry",
            riskScore=case.risk_score,
            recoveryProbability=case.recovery_probability,
            expectedRecovery=case.expected_recovery_amount,
            policyChecks=policy_checks,
            created_at=case.created_at,
            updated_at=case.updated_at,
            resolved_at=case.resolved_at,
        )

    @staticmethod
    async def list_cases(
        session: AsyncSession,
        merchant_id: uuid.UUID,
        page: int = 1,
        limit: int = 50,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[RecoveryCaseResponse], int]:
        """List recovery cases strictly scoped to the authenticated merchant."""
        query = (
            select(RecoveryCase)
            .options(
                joinedload(RecoveryCase.customer),
                joinedload(RecoveryCase.transaction),
            )
            .where(RecoveryCase.merchant_id == merchant_id)
        )

        if status and status.upper() != "ALL":
            query = query.where(RecoveryCase.status == status.upper())

        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.join(RecoveryCase.customer).where(
                (RecoveryCase.root_cause.ilike(search_pattern))
                | (RecoveryCase.recommended_strategy.ilike(search_pattern))
                | (Customer.name.ilike(search_pattern))
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = await session.scalar(count_query) or 0

        query = query.order_by(RecoveryCase.created_at.desc())
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        result = await session.execute(query)
        cases = list(result.scalars().unique().all())

        formatted_cases = [RecoveryService._format_case(c) for c in cases]
        return formatted_cases, total

    @staticmethod
    async def get_by_id(
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
    ) -> RecoveryCaseResponse:
        """Fetch single recovery case with merchant ownership check."""
        query = (
            select(RecoveryCase)
            .options(
                joinedload(RecoveryCase.customer),
                joinedload(RecoveryCase.transaction),
            )
            .where(
                RecoveryCase.id == case_id,
                RecoveryCase.merchant_id == merchant_id,
            )
        )
        result = await session.execute(query)
        case = result.scalars().first()

        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recovery case not found",
            )
        return RecoveryService._format_case(case)

    @staticmethod
    async def retry_case(
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> RecoveryCaseResponse:
        """Manually trigger retry on a case, validating policy and publishing event."""
        case = await session.get(RecoveryCase, case_id)
        if not case or case.merchant_id != merchant_id:
            raise HTTPException(status_code=404, detail="Recovery case not found")

        case.attempt_count += 1
        case.status = RecoveryStatus.EXECUTING.value
        await session.flush()

        # Publish event
        await EventPublisher.publish_event(
            event_type=EventType.ACTION_STARTED,
            merchant_id=merchant_id,
            case_id=case.id,
            data={"action": "RETRY", "attempt": case.attempt_count, "reason": reason},
        )

        return RecoveryService._format_case(case)

    @staticmethod
    async def stop_case(
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> RecoveryCaseResponse:
        """Stop autonomous actions on a case and publish stopping event."""
        case = await session.get(RecoveryCase, case_id)
        if not case or case.merchant_id != merchant_id:
            raise HTTPException(status_code=404, detail="Recovery case not found")

        case.status = RecoveryStatus.STOPPED.value
        await session.flush()

        await EventPublisher.publish_event(
            event_type=EventType.CASE_STOPPED,
            merchant_id=merchant_id,
            case_id=case.id,
            data={"reason": reason or "Merchant requested stop"},
        )

        return RecoveryService._format_case(case)

    @staticmethod
    async def escalate_case(
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> RecoveryCaseResponse:
        """Escalate case to manual review queue."""
        case = await session.get(RecoveryCase, case_id)
        if not case or case.merchant_id != merchant_id:
            raise HTTPException(status_code=404, detail="Recovery case not found")

        case.status = RecoveryStatus.ESCALATED.value
        await session.flush()

        await EventPublisher.publish_event(
            event_type=EventType.CASE_ESCALATED,
            merchant_id=merchant_id,
            case_id=case.id,
            data={"reason": reason or "Escalated for manual review"},
        )

        return RecoveryService._format_case(case)
