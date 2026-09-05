import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.recovery_case import RecoveryCase
from app.models.customer import Customer
from app.models.audit_log import AuditLog
from app.schemas.recovery import (
    RecoveryCaseResponse,
    RecoveryCaseListResponse,
    RecoveryCaseActionRequest,
    MerchantChatRequest,
    MerchantChatResponse,
    StrategyApprovalRequest,
)
from app.services.recovery_service import RecoveryService
from app.agents.schemas import MultiAgentAnalysisResponse
from app.agents.coordinator import coordinator

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
    case_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieve full details, intelligence telemetry, and dynamic timeline for a specific recovery case.
    """
    try:
        case_uuid = uuid.UUID(case_id)
        return await RecoveryService.get_by_id(
            session=session,
            case_id=case_uuid,
            merchant_id=current_user.merchant_id,
        )
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Recovery case '{case_id}' not found in database",
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
    return await RecoveryService.verify_and_settle_recovery(
        session=session,
        case_id=case_id,
        payment_data={"reason": request.reason if request else "Merchant manual retry"},
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


@router.post("/cases/{case_id}/analyze", response_model=MultiAgentAnalysisResponse)
async def analyze_recovery_case(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Trigger full autonomous multi-agent reasoning pipeline on a case:
    Detection -> Root Cause -> Strategy -> Policy Check.
    """
    return await coordinator.analyze_case(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
        auto_execute=False,
    )


@router.post("/cases/{case_id}/execute", response_model=MultiAgentAnalysisResponse)
async def execute_recovery_case(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Execute autonomous recovery intervention on an approved case.
    """
    return await coordinator.analyze_case(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
        auto_execute=True,
    )


@router.post("/cases/{case_id}/payment-link", summary="Generate Secure Smart Recovery Link")
async def generate_case_payment_link(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Generates a secure, signed, short-lived, customer-specific recovery link.
    """
    return await RecoveryService.generate_smart_recovery_link(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
    )


@router.post("/cases/{case_id}/approve", response_model=RecoveryCaseResponse)
async def approve_case_strategy(
    case_id: uuid.UUID,
    request: StrategyApprovalRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Merchant authorizes the AI recommended recovery strategy.
    """
    return await RecoveryService.approve_strategy(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
        notes=request.notes,
    )


@router.post("/cases/{case_id}/reject", response_model=RecoveryCaseResponse)
async def reject_case_strategy(
    case_id: uuid.UUID,
    request: StrategyApprovalRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Merchant rejects strategy recommendation, triggering Strategy Agent replanning.
    """
    return await RecoveryService.reject_strategy(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
        notes=request.notes,
    )


@router.post("/cases/{case_id}/chat", response_model=MerchantChatResponse)
async def merchant_agent_chat(
    case_id: uuid.UUID,
    request: MerchantChatRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Merchant ↔ Agent case-scoped intelligence chat.
    Answers grounded strictly in case facts.
    """
    return await RecoveryService.merchant_chat(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
        message=request.message,
    )


@router.get("/cases/{case_id}/agent-executions", response_model=List[Dict[str, Any]])
async def get_case_agent_executions(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Fetch all persisted agent execution records with real latency and token usage.
    """
    return await RecoveryService.get_agent_executions(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
    )


@router.post("/cases/{case_id}/send-customer-email")
async def send_customer_recovery_email(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Merchant authorizes AI Agent to dispatch the timed secure recovery link email
    directly to the customer.
    """
    return await RecoveryService.send_recovery_email_to_customer(
        session=session,
        case_id=case_id,
        merchant_id=current_user.merchant_id,
    )
