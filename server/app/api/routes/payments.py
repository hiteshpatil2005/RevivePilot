import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.models.payment_event import PaymentEvent
from app.api.deps import get_current_user
from app.payments.schemas import (
    PaymentEventCreate,
    PaymentEventResponse,
    PaymentEventListResponse,
    SimulatorConfig,
    SimulatorStatusResponse,
    ManualPaymentTriggerRequest,
)
from app.payments.event_service import PaymentEventService
from app.payments.simulator import payment_simulator

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post(
    "/events",
    response_model=PaymentEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or ingest a payment event",
)
async def create_payment_event(
    payload: PaymentEventCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ingest a payment event, execute transaction state transitions,
    evaluate deterministic risk, generate recovery cases on failure,
    and broadcast to Redis and WebSocket channels.
    """
    event = await PaymentEventService.process_payment_event(
        session=db,
        merchant_id=current_user.merchant_id,
        event_type=payload.event_type,
        transaction_id=payload.transaction_id,
        customer_id=payload.customer_id,
        amount=payload.amount,
        currency=payload.currency,
        payment_method=payload.payment_method,
        failure_reason=payload.failure_reason,
        source=payload.source,
        idempotency_key=idempotency_key,
        metadata=payload.metadata,
    )
    return event


@router.get(
    "/events",
    response_model=PaymentEventListResponse,
    summary="List payment events with merchant isolation",
)
async def list_payment_events(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    transaction_id: Optional[uuid.UUID] = Query(None, alias="transactionId"),
    event_type: Optional[str] = Query(None, alias="eventType"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List payment events with tenant isolation and optional filtering."""
    query = select(PaymentEvent).where(PaymentEvent.merchant_id == current_user.merchant_id)

    if transaction_id:
        query = query.where(PaymentEvent.transaction_id == transaction_id)
    if event_type:
        query = query.where(PaymentEvent.event_type == event_type.upper())

    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query) or 0

    offset = (page - 1) * limit
    results = await db.scalars(
        query.order_by(desc(PaymentEvent.created_at)).offset(offset).limit(limit)
    )
    events = list(results.all())

    return PaymentEventListResponse(
        events=[PaymentEventResponse.model_validate(e) for e in events],
        total=total,
        page=page,
        limit=limit,
    )


# ---------------------------------------------------------
# Payment Simulator Controls
# ---------------------------------------------------------

@router.post(
    "/simulator/start",
    response_model=SimulatorStatusResponse,
    summary="Start background payment event simulation",
)
async def start_simulator(
    config: SimulatorConfig,
    current_user: User = Depends(get_current_user),
):
    """Start the synthetic payment event simulator for the current merchant."""
    return await payment_simulator.start(current_user.merchant_id, config)


@router.post(
    "/simulator/stop",
    response_model=SimulatorStatusResponse,
    summary="Stop payment event simulation",
)
async def stop_simulator(
    current_user: User = Depends(get_current_user),
):
    """Stop the synthetic payment event simulator."""
    return await payment_simulator.stop(current_user.merchant_id)


@router.post(
    "/simulator/pause",
    response_model=SimulatorStatusResponse,
    summary="Pause payment event simulation",
)
async def pause_simulator(
    current_user: User = Depends(get_current_user),
):
    """Pause event generation without canceling background worker."""
    return payment_simulator.pause(current_user.merchant_id)


@router.post(
    "/simulator/resume",
    response_model=SimulatorStatusResponse,
    summary="Resume paused payment event simulation",
)
async def resume_simulator(
    current_user: User = Depends(get_current_user),
):
    """Resume event generation."""
    return payment_simulator.resume(current_user.merchant_id)


@router.get(
    "/simulator/status",
    response_model=SimulatorStatusResponse,
    summary="Get simulator status",
)
async def get_simulator_status(
    current_user: User = Depends(get_current_user),
):
    """Retrieve current simulator running status and metrics."""
    return payment_simulator.get_status(current_user.merchant_id)


@router.post(
    "/simulator/event",
    status_code=status.HTTP_200_OK,
    summary="Trigger single manual simulated payment event",
)
async def trigger_simulator_event(
    payload: ManualPaymentTriggerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger a single simulated payment event for testing."""
    await payment_simulator.emit_single_event(
        merchant_id=current_user.merchant_id,
        scenario=payload.scenario,
        failure_reason=payload.failure_reason,
        amount=payload.amount,
        payment_method=payload.payment_method,
        session=db,
    )
    return {"success": True, "message": "Simulation event emitted successfully"}
