import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.recovery import (
    RecoveryCaseResponse,
    RecoveryCaseListResponse,
    RecoveryCaseActionRequest,
)
from app.services.recovery_service import RecoveryService

router = APIRouter(prefix="/recovery", tags=["Recovery Cases"])


@router.get("/cases", response_model=RecoveryCaseListResponse)
async def list_recovery_cases(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    List recovery cases for the authenticated merchant with filtering and search.
    """
    items, total = await RecoveryService.list_cases(
        session=session,
        merchant_id=current_user.merchant_id,
        page=page,
        limit=limit,
        status=status,
        search=search,
    )
    return RecoveryCaseListResponse(
        cases=items,
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/cases/{case_id}", response_model=RecoveryCaseResponse)
async def get_recovery_case(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieve full details and policy checks for a specific recovery case.
    """
    return await RecoveryService.get_by_id(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
    )


@router.post("/cases/{case_id}/retry", response_model=RecoveryCaseResponse)
async def retry_recovery_case(
    case_id: uuid.UUID,
    request: Optional[RecoveryCaseActionRequest] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Trigger manual or policy-governed retry intervention for a recovery case.
    """
    return await RecoveryService.retry_case(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
        reason=request.reason if request else None,
    )


@router.post("/cases/{case_id}/stop", response_model=RecoveryCaseResponse)
async def stop_recovery_case(
    case_id: uuid.UUID,
    request: Optional[RecoveryCaseActionRequest] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Halt all autonomous recovery actions on a case.
    """
    return await RecoveryService.stop_case(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
        reason=request.reason if request else None,
    )


@router.post("/cases/{case_id}/escalate", response_model=RecoveryCaseResponse)
async def escalate_recovery_case(
    case_id: uuid.UUID,
    request: Optional[RecoveryCaseActionRequest] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Escalate case to human review queue.
    """
    return await RecoveryService.escalate_case(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
        reason=request.reason if request else None,
    )
