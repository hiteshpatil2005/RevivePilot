import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.policy import Policy
from app.schemas.policy import (
    PolicyCreate,
    PolicyUpdate,
    PolicyEvaluationRequest,
    PolicyEvaluationResponse,
    PolicyCheckResult,
)


class PolicyService:
    @staticmethod
    async def list_policies(session: AsyncSession, merchant_id: uuid.UUID) -> List[Policy]:
        query = select(Policy).where(Policy.merchant_id == merchant_id)
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(session: AsyncSession, policy_id: uuid.UUID, merchant_id: uuid.UUID) -> Policy:
        query = select(Policy).where(
            Policy.id == policy_id,
            Policy.merchant_id == merchant_id,
        )
        result = await session.execute(query)
        policy = result.scalars().first()
        if not policy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
        return policy

    @staticmethod
    async def update(
        session: AsyncSession,
        policy_id: uuid.UUID,
        merchant_id: uuid.UUID,
        data: PolicyUpdate,
    ) -> Policy:
        policy = await PolicyService.get_by_id(session, policy_id, merchant_id)
        if data.name is not None:
            policy.name = data.name
        if data.enabled is not None:
            policy.enabled = data.enabled
        if data.configuration is not None:
            policy.configuration = data.configuration
        await session.flush()
        return policy

    @staticmethod
    def evaluate(request: PolicyEvaluationRequest) -> PolicyEvaluationResponse:
        """
        Evaluate policy simulation dry-run based on merchant rules.
        """
        checks = [
            PolicyCheckResult(
                label="Amount limit",
                pass_=request.amount <= 50000.0,
                value=f"₹{request.amount:,.2f}",
                note="Within standard automatic retry threshold" if request.amount <= 50000.0 else "Exceeds ₹50,000 auto limit",
            ),
            PolicyCheckResult(
                label="Retry count",
                pass_=request.retryCount < 3,
                value=f"{request.retryCount}/3",
                note="Under maximum retry limit" if request.retryCount < 3 else "Maximum retry attempts exhausted",
            ),
            PolicyCheckResult(
                label="AI confidence",
                pass_=request.aiConfidence >= 70,
                value=f"{request.aiConfidence}%",
                note="Meets required confidence threshold" if request.aiConfidence >= 70 else "Below acceptable threshold",
            ),
            PolicyCheckResult(
                label="Recovery probability",
                pass_=request.recoveryProbability >= 40,
                value=f"{request.recoveryProbability}%",
                note="Sufficient recovery probability" if request.recoveryProbability >= 40 else "Probability too low to retry",
            ),
        ]

        blocked_checks = [c for c in checks if not c.pass_]

        if not blocked_checks:
            decision = "APPROVED"
            res_type = "approved"
        elif len(blocked_checks) == 1 and not checks[0].pass_:
            decision = "MANUAL_APPROVAL"
            res_type = "manual"
        else:
            decision = "BLOCKED"
            res_type = "blocked"

        return PolicyEvaluationResponse(
            decision=decision,
            checks=checks,
            type=res_type,
        )
