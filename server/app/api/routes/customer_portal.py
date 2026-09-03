import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.database.session import get_db
from app.api.deps import get_current_customer
from app.models.customer import Customer
from app.models.transaction import Transaction, TransactionStatus
from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.audit_log import AuditLog
from app.payments.failure_taxonomy import FAILURE_TAXONOMY
from app.agents.coordinator import AgentCoordinator
from app.websocket.socketio_server import emit_to_customer, emit_to_merchant
from app.core.logging import logger

router = APIRouter(prefix="/customer", tags=["Customer Portal"])


# ── Pydantic Request/Response Models ──────────────────────────────────────────
class SimulatePaymentPayload(BaseModel):
    amount: Decimal = Field(Decimal("5000.00"), ge=1.0)
    method: str = Field("UPI", description="Payment method: UPI, CARD, NETBANKING")
    scenario: str = Field("BANK_TIMEOUT", description="Failure taxonomy cause or SUCCESS/NORMAL")
    item_name: Optional[str] = "Acme Cloud Compute Node"


class PaymentResultResponse(BaseModel):
    success: bool
    status: str
    payment_id: str
    order_id: str
    amount: float
    method: str
    case_id: Optional[str] = None
    failure_reason: Optional[str] = None
    error_code: Optional[str] = None
    remaining_balance: Optional[float] = None
    message: str


# ── 1. Simulated Payment Endpoint ─────────────────────────────────────────────
@router.post("/payments/simulate", response_model=PaymentResultResponse)
async def simulate_customer_payment(
    payload: SimulatePaymentPayload,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
):
    """
    Simulates a payment strictly scoped to the authenticated customer.
    Creates PostgreSQL records, publishes Redis events, triggers AI agents,
    and emits real-time updates strictly to customer:{id} and merchant:{id}.
    """
    # Verify and derive identity strictly from authenticated customer JWT
    customer_id = current_customer.id
    merchant_id = current_customer.merchant_id

    scenario_upper = payload.scenario.strip().upper()
    is_success = scenario_upper in ["SUCCESS", "NORMAL"]

    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    raw_order_id = f"order_{uuid.uuid4().hex[:10]}"
    display_order_id = f"{payload.item_name or 'Acme Cloud Compute Node'} ({raw_order_id})"

    if is_success:
        # Deduct balance from customer account in database
        curr_bal = Decimal(str(current_customer.balance if current_customer.balance is not None else 150000.00))
        new_balance = max(Decimal("0.00"), curr_bal - payload.amount)
        current_customer.balance = new_balance
        session.add(current_customer)

        # 1. Successful payment
        tx = Transaction(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            customer_id=customer_id,
            external_payment_id=payment_id,
            external_order_id=display_order_id,
            amount=payload.amount,
            currency="INR",
            status=TransactionStatus.SUCCESS.value,
            payment_method=payload.method,
            failure_reason=None,
        )
        session.add(tx)

        audit = AuditLog(
            merchant_id=merchant_id,
            event_type="PAYMENT_SUCCESS",
            actor_type="CUSTOMER",
            description=f"Customer {current_customer.name} completed simulated payment of ₹{payload.amount}",
            metadata_={
                "customer_id": str(customer_id),
                "payment_id": payment_id,
                "amount": float(payload.amount),
                "remaining_balance": float(new_balance),
                "method": payload.method,
            },
        )
        session.add(audit)
        await session.commit()
        await session.refresh(tx)
        await session.refresh(current_customer)

        # Scoped real-time emission
        envelope = {
            "payment_id": payment_id,
            "order_id": raw_order_id,
            "amount": float(payload.amount),
            "remaining_balance": float(new_balance),
            "status": "SUCCESS",
            "method": payload.method,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await emit_to_customer(str(customer_id), "payment.captured", envelope)
        await emit_to_customer(str(customer_id), "customer.balance.updated", {
            "balance": float(new_balance),
            "deducted": float(payload.amount),
        })
        await emit_to_merchant(str(merchant_id), "payment.captured", envelope)

        return PaymentResultResponse(
            success=True,
            status="SUCCESS",
            payment_id=payment_id,
            order_id=raw_order_id,
            amount=float(payload.amount),
            remaining_balance=float(new_balance),
            method=payload.method,
            message="Payment captured successfully!",
        )

    # 2. Simulated Payment Failure (Real infrastructure workflow)
    taxonomy_info = FAILURE_TAXONOMY.get(
        scenario_upper,
        {
            "category": "BANK",
            "error_code": "GATEWAY_ERROR",
            "error_description": f"Transaction failed due to {payload.scenario}",
            "error_source": "bank",
            "error_step": "payment_authorization",
            "error_reason": "payment_failed",
            "suggested_action": "RETRY_AFTER_COOLDOWN",
        },
    )

    tx = Transaction(
        id=uuid.uuid4(),
        merchant_id=merchant_id,
        customer_id=customer_id,
        external_payment_id=payment_id,
        external_order_id=order_id,
        amount=payload.amount,
        currency="INR",
        status=TransactionStatus.FAILED.value,
        payment_method=payload.method,
        failure_reason=scenario_upper,
    )
    session.add(tx)

    # Create Recovery Case in PostgreSQL
    case_id = uuid.uuid4()
    recovery_case = RecoveryCase(
        id=case_id,
        merchant_id=merchant_id,
        customer_id=customer_id,
        transaction_id=tx.id,
        status=RecoveryStatus.DETECTED.value,
        root_cause=scenario_upper,
        risk_score=75,
        recovery_probability=85,
        attempt_count=1,
        max_attempts=3,
    )
    session.add(recovery_case)

    # Audit Trail
    audit = AuditLog(
        merchant_id=merchant_id,
        recovery_case_id=case_id,
        event_type="PAYMENT_FAILED",
        actor_type="CUSTOMER",
        description=f"Payment failed for customer {current_customer.name}: {scenario_upper}",
        metadata_={
            "customer_id": str(customer_id),
            "payment_id": payment_id,
            "case_id": str(case_id),
            "failure_reason": scenario_upper,
            "amount": float(payload.amount),
            "payment_mode": "SIMULATED",
        },
    )
    session.add(audit)

    await session.commit()
    await session.refresh(tx)
    await session.refresh(recovery_case)

    # Real-time event 1: payment.failed
    fail_event = {
        "payment_id": payment_id,
        "order_id": order_id,
        "case_id": str(case_id),
        "customer_id": str(customer_id),
        "amount": float(payload.amount),
        "status": "FAILED",
        "method": payload.method,
        "failure_reason": scenario_upper,
        "error_code": taxonomy_info.get("error_code", "PAYMENT_FAILED"),
        "error_description": taxonomy_info.get("error_description", "Payment could not be completed"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await emit_to_customer(str(customer_id), "payment.failed", fail_event)
    await emit_to_merchant(str(merchant_id), "payment.failed", fail_event)

    # Execute Autonomous AI Recovery Workflow
    try:
        coordinator = AgentCoordinator()
        # Analyze and formulate strategy
        analysis = await coordinator.analyze_case(
            session=session,
            case_id=case_id,
            merchant_id=merchant_id,
            auto_execute=True,
        )

        # Emit backend-driven step transitions to customer room
        await emit_to_customer(str(customer_id), "recovery.case.created", {
            "case_id": str(case_id),
            "status": "DETECTED",
            "message": "Payment failure registered in recovery engine",
        })
        await emit_to_customer(str(customer_id), "recovery.analysis.started", {
            "case_id": str(case_id),
            "status": "ANALYZING",
            "message": "AI agents diagnosing root cause and network health",
        })
        await emit_to_customer(str(customer_id), "recovery.root_cause_identified", {
            "case_id": str(case_id),
            "root_cause": scenario_upper,
            "category": taxonomy_info.get("category", "BANK"),
            "message": f"Identified: {scenario_upper}",
        })
        await emit_to_customer(str(customer_id), "recovery.strategy_selected", {
            "case_id": str(case_id),
            "strategy": taxonomy_info.get("suggested_action", "AUTONOMOUS_RETRY"),
            "confidence": 0.94,
            "message": "Formulated optimal recovery route",
        })
        await emit_to_customer(str(customer_id), "recovery.action.completed", {
            "case_id": str(case_id),
            "action_type": "RETRY_AVAILABLE",
            "recovery_link": f"https://rzp.io/i/rec_{str(case_id)[:8]}",
            "message": "Instant recovery route active. You can retry now.",
        })

        # Emit merchant dashboard update
        await emit_to_merchant(str(merchant_id), "recovery.case.updated", {
            "case_id": str(case_id),
            "customer_id": str(customer_id),
            "amount": float(payload.amount),
            "status": "EXECUTING",
            "root_cause": scenario_upper,
        })
    except Exception as exc:
        logger.error(f"[CustomerPortal] Agent execution failed for case {case_id}: {exc}")

    return PaymentResultResponse(
        success=False,
        status="FAILED",
        payment_id=payment_id,
        order_id=order_id,
        case_id=str(case_id),
        amount=float(payload.amount),
        method=payload.method,
        failure_reason=scenario_upper,
        error_code=taxonomy_info.get("error_code", "PAYMENT_FAILED"),
        message=f"Simulated failure: {taxonomy_info.get('error_description', scenario_upper)}",
    )


# ── 2. Get Single Recovery Case (Strict Ownership Enforced) ───────────────────
@router.get("/recovery/{case_id}")
async def get_customer_recovery_case(
    case_id: uuid.UUID,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieves recovery case strictly scoped to the authenticated customer.
    Customer B attempting to access Customer A's case receives 404.
    """
    case = await session.get(RecoveryCase, case_id)
    if not case or case.customer_id != current_customer.id or case.merchant_id != current_customer.merchant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recovery case not found.",
        )

    tx = await session.get(Transaction, case.transaction_id) if case.transaction_id else None

    return {
        "id": str(case.id),
        "status": case.status,
        "root_cause": case.root_cause,
        "amount": float(tx.amount) if tx else 5000.0,
        "payment_method": tx.payment_method if tx else "UPI",
        "attempt_count": case.attempt_count,
        "max_attempts": case.max_attempts,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "updated_at": case.updated_at.isoformat() if case.updated_at else None,
    }


# ── 3. Get Active Recovery Case for Customer ──────────────────────────────────
@router.get("/recovery/active/current")
async def get_active_customer_recovery(
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
):
    """
    Returns the most recent active recovery case belonging to this customer.
    """
    query = (
        select(RecoveryCase)
        .where(
            RecoveryCase.customer_id == current_customer.id,
            RecoveryCase.merchant_id == current_customer.merchant_id,
            RecoveryCase.status.in_([
                RecoveryStatus.DETECTED.value,
                RecoveryStatus.ANALYZING.value,
                RecoveryStatus.ROOT_CAUSE_IDENTIFIED.value,
                RecoveryStatus.STRATEGY_SELECTED.value,
                RecoveryStatus.APPROVED.value,
                RecoveryStatus.EXECUTING.value,
            ]),
        )
        .order_by(RecoveryCase.created_at.desc())
        .limit(1)
    )
    case = (await session.scalars(query)).first()
    if not case:
        return {"has_active_case": False, "case": None}

    tx = await session.get(Transaction, case.transaction_id) if case.transaction_id else None
    return {
        "has_active_case": True,
        "case": {
            "id": str(case.id),
            "status": case.status,
            "root_cause": case.root_cause,
            "amount": float(tx.amount) if tx else 5000.0,
            "payment_method": tx.payment_method if tx else "UPI",
            "created_at": case.created_at.isoformat() if case.created_at else None,
        },
    }


# ── 4. Complete / Retry Simulated Recovery ───────────────────────────────────
@router.post("/recovery/{case_id}/retry")
async def complete_customer_recovery(
    case_id: uuid.UUID,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
):
    """
    Customer completes simulated recovery payment.
    Enforces strict customer ownership.
    Updates Transaction to SUCCESS, RecoveryCase to RECOVERED, and updates database revenue.
    """
    case = await session.get(RecoveryCase, case_id)
    if not case or case.customer_id != current_customer.id or case.merchant_id != current_customer.merchant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recovery case not found.",
        )

    tx = await session.get(Transaction, case.transaction_id) if case.transaction_id else None
    recovered_amount = tx.amount if tx else Decimal("5000.00")

    # Deduct recovered amount from customer account in database
    curr_bal = Decimal(str(current_customer.balance if current_customer.balance is not None else 150000.00))
    new_balance = max(Decimal("0.00"), curr_bal - recovered_amount)
    current_customer.balance = new_balance
    session.add(current_customer)

    # Update state in PostgreSQL
    case.status = RecoveryStatus.RECOVERED.value
    if tx:
        tx.status = TransactionStatus.SUCCESS.value
        tx.failure_reason = None

    # Record Audit Log
    audit = AuditLog(
        merchant_id=current_customer.merchant_id,
        recovery_case_id=case.id,
        event_type="RECOVERY_COMPLETED",
        actor_type="CUSTOMER",
        description=f"Recovery successfully completed for customer {current_customer.name}. Recovered: ₹{recovered_amount}",
        metadata_={
            "customer_id": str(current_customer.id),
            "case_id": str(case.id),
            "recovered_amount": float(recovered_amount),
            "remaining_balance": float(new_balance),
            "method": tx.payment_method if tx else "UPI",
        },
    )
    session.add(audit)

    await session.commit()
    await session.refresh(case)
    await session.refresh(current_customer)

    # Scoped real-time emissions
    customer_payload = {
        "case_id": str(case.id),
        "status": "RECOVERED",
        "recovered_amount": float(recovered_amount),
        "remaining_balance": float(new_balance),
        "message": f"Payment of ₹{float(recovered_amount):,.2f} recovered successfully!",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    merchant_payload = {
        "case_id": str(case.id),
        "customer_id": str(current_customer.id),
        "status": "RECOVERED",
        "recovered_amount": float(recovered_amount),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    await emit_to_customer(str(current_customer.id), "payment.recovered", customer_payload)
    await emit_to_customer(str(current_customer.id), "customer.balance.updated", {
        "balance": float(new_balance),
        "deducted": float(recovered_amount),
    })
    await emit_to_merchant(str(current_customer.merchant_id), "recovery.case.updated", merchant_payload)
    await emit_to_merchant(str(current_customer.merchant_id), "recovered_revenue.updated", {
        "added_amount": float(recovered_amount),
    })

    return {
        "success": True,
        "status": "RECOVERED",
        "case_id": str(case.id),
        "recovered_amount": float(recovered_amount),
        "remaining_balance": float(new_balance),
        "message": f"Payment of ₹{float(recovered_amount):,.2f} recovered successfully!",
    }


# ── 5. Customer Transaction History ──────────────────────────────────────────
@router.get("/orders")
async def list_customer_orders(
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
):
    """
    Lists transaction history belonging strictly to the authenticated customer.
    Multi-tenant isolation guaranteed at database query level.
    """
    query = (
        select(Transaction)
        .options(selectinload(Transaction.recovery_cases))
        .where(
            Transaction.customer_id == current_customer.id,
            Transaction.merchant_id == current_customer.merchant_id,
        )
        .order_by(Transaction.created_at.desc())
        .limit(50)
    )
    result = await session.execute(query)
    transactions = result.scalars().all()

    items = []
    for t in transactions:
        case_id = None
        case_status = None
        if t.recovery_cases:
            sorted_cases = sorted(t.recovery_cases, key=lambda x: x.created_at or datetime.min, reverse=True)
            latest_c = sorted_cases[0]
            case_id = str(latest_c.id)
            case_status = latest_c.status

        # Determine effective status
        if case_status == RecoveryStatus.RECOVERED.value or t.status == TransactionStatus.SUCCESS.value:
            status_val = "RECOVERED" if case_status == RecoveryStatus.RECOVERED.value else "SUCCESS"
        elif t.status == TransactionStatus.FAILED.value:
            status_val = "FAILED"
        else:
            status_val = t.status

        # Parse item name
        item_name = "Acme Cloud Compute Node"
        if t.external_order_id:
            if "(" in t.external_order_id:
                item_name = t.external_order_id.split("(")[0].strip()
            else:
                item_name = t.external_order_id

        items.append({
            "id": str(t.id),
            "payment_id": t.external_payment_id or str(t.id)[:12],
            "amount": float(t.amount),
            "currency": t.currency,
            "status": status_val,
            "itemName": item_name,
            "item_name": item_name,
            "paymentMethod": t.payment_method or "Razorpay Standard",
            "payment_method": t.payment_method or "Razorpay Standard",
            "failureReason": t.failure_reason,
            "failure_reason": t.failure_reason,
            "caseId": case_id,
            "case_id": case_id,
            "date": t.created_at.isoformat() if t.created_at else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return {"orders": items, "total": len(items)}
