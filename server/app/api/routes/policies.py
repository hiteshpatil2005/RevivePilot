import uuid
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.policy import (
    PolicyResponse,
    PolicyUpdate,
    PolicyEvaluationRequest,
    PolicyEvaluationResponse,
)
from app.services.policy_service import PolicyService

router = APIRouter(prefix="/policies", tags=["Policies"])


@router.get("", response_model=List[PolicyResponse])
async def list_policies(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieve all policy rule sets configured for the authenticated merchant.
    """
    return await PolicyService.list_policies(session, current_user.merchant_id)


@router.get("/{policy_id}", response_model=PolicyResponse)
async def get_policy(
    policy_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Get a specific merchant policy by ID.
    """
    return await PolicyService.get_by_id(session, policy_id, current_user.merchant_id)


@router.put("/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: uuid.UUID,
    data: PolicyUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Update rules, thresholds, and activation state for a merchant policy.
    """
    return await PolicyService.update(session, policy_id, current_user.merchant_id, data)


@router.post("/evaluate", response_model=PolicyEvaluationResponse)
async def evaluate_policy(
    request: PolicyEvaluationRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Simulate policy evaluation dry-run against merchant configuration.
    """
    return PolicyService.evaluate(request)
