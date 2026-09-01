import uuid
from typing import Optional
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
)
from app.services.recovery_service import RecoveryService
from app.agents.schemas import MultiAgentAnalysisResponse
from app.agents.coordinator import coordinator
from app.payments.razorpay_client import RazorpayClient

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


@router.post("/cases/{case_id}/payment-link", summary="Generate Razorpay Smart Recovery Link")
async def generate_case_payment_link(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Generates a branded, one-click smart payment link via Razorpay for customer self-recovery.
    """
    case = await session.get(RecoveryCase, case_id)
    if not case or case.merchant_id != current_user.merchant_id:
        raise HTTPException(status_code=404, detail="Recovery case not found")

    customer = await session.get(Customer, case.customer_id) if case.customer_id else None
    
    link_data = await RazorpayClient.create_payment_link(
        amount=case.expected_recovery_amount,
        currency="INR",
        description=f"RevivePilot Recovery for Case {str(case.id)[:8]}",
        customer_name=customer.name if customer else "Customer",
        customer_email=customer.email if customer else "customer@example.com",
        customer_phone=customer.phone if customer else "+919876543210",
        case_id=str(case.id),
    )

    audit = AuditLog(
        merchant_id=current_user.merchant_id,
        recovery_case_id=case.id,
        event_type="PAYMENT_LINK_GENERATED",
        actor_type="AI_AGENT",
        description=f"Generated Razorpay Smart Alternative Payment Link: {link_data.get('short_url')}",
        metadata_={
            "payment_link": link_data.get("short_url"),
            "link_id": link_data.get("id"),
        },
    )
    session.add(audit)
    await session.commit()

    return {
        "success": True,
        "payment_link": link_data.get("short_url"),
        "link_id": link_data.get("id"),
        "amount": float(case.expected_recovery_amount),
    }
