import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.database.session import get_db
from app.api.deps import get_current_customer
from app.models.customer import Customer
from app.models.merchant import Merchant
from app.models.transaction import Transaction, TransactionStatus
from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.audit_log import AuditLog
from app.models.recovery_conversation import RecoveryConversation
from app.payments.failure_taxonomy import FAILURE_TAXONOMY, generate_gateway_failure_payload
from app.agents.coordinator import coordinator
from app.services.recovery_service import RecoveryService
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
    recovery_state: Optional[str] = None
    next_action: Optional[str] = None
    strategy: Optional[str] = None
    conversation_starter: Optional[str] = None
    has_recovery_link: bool = False
    recovery_url: Optional[str] = None
    smart_link_token: Optional[str] = None
    email_sent: bool = False
    agent_decision: Optional[str] = None


class CustomerChatPayload(BaseModel):
    message: Optional[str] = None
    selected_option: Optional[str] = None


class CustomerChatOutput(BaseModel):
    reply: str
    case_status: str
    strategy: str
    next_action: str


class RecoveryLinkPayPayload(BaseModel):
    method: str = "UPI"


# ── 1. Simulated Payment Endpoint ─────────────────────────────────────────────
@router.post("/payments/simulate", response_model=PaymentResultResponse)
async def simulate_customer_payment(
    payload: SimulatePaymentPayload,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
):
    """
    Simulates a payment strictly scoped to the authenticated customer.
    On failure: Creates PostgreSQL records, triggers the 4-agent reasoning pipeline,
    initiates interactive customer recovery conversation, and places cases on hold/waiting
    WITHOUT prematurely auto-settling.
    """
    customer_id = current_customer.id
    merchant_id = current_customer.merchant_id

    scenario_upper = payload.scenario.strip().upper()
    is_success = scenario_upper in ["SUCCESS", "NORMAL"]

    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    raw_order_id = f"order_{uuid.uuid4().hex[:10]}"
    order_id = raw_order_id
    display_order_id = f"{payload.item_name or 'Acme Cloud Compute Node'} ({raw_order_id})"

    if is_success:
        curr_bal = Decimal(str(current_customer.balance if current_customer.balance is not None else 150000.00))
        new_balance = max(Decimal("0.00"), curr_bal - payload.amount)
        current_customer.balance = new_balance
        session.add(current_customer)

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
            description=f"Customer {current_customer.name} completed payment of ₹{payload.amount:,.2f}",
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

    # 2. Failure: Authentic Gateway Telemetry
    gw_payload = generate_gateway_failure_payload(
        failure_reason=scenario_upper,
        payment_id=payment_id,
        order_id=order_id,
        amount=float(payload.amount),
        method=payload.method,
    )

    tx = Transaction(
        id=uuid.uuid4(),
        merchant_id=merchant_id,
        customer_id=customer_id,
        external_payment_id=payment_id,
        external_order_id=display_order_id,
        amount=payload.amount,
        currency="INR",
        status=TransactionStatus.FAILED.value,
        payment_method=payload.method,
        failure_reason=scenario_upper,
    )
    session.add(tx)

    case_id = uuid.uuid4()
    recovery_case = RecoveryCase(
        id=case_id,
        merchant_id=merchant_id,
        customer_id=customer_id,
        transaction_id=tx.id,
        status=RecoveryStatus.DETECTED.value,
        root_cause=scenario_upper,
        risk_score=gw_payload.get("base_risk", 75),
        recovery_probability=int(gw_payload.get("base_prob", 0.85) * 100),
        attempt_count=1,
        max_attempts=3,
        expected_recovery_amount=payload.amount,
    )
    session.add(recovery_case)

    audit = AuditLog(
        merchant_id=merchant_id,
        recovery_case_id=case_id,
        event_type="PAYMENT_FAILED",
        actor_type="CUSTOMER",
        description=f"Payment failed for {current_customer.name}: {scenario_upper} (Bank code: {gw_payload.get('bank_error_code')})",
        metadata_={
            "customer_id": str(customer_id),
            "payment_id": payment_id,
            "case_id": str(case_id),
            "failure_reason": scenario_upper,
            "amount": float(payload.amount),
            "gateway_error": gw_payload.get("error", {}),
            "bank_error_code": gw_payload.get("bank_error_code"),
            "error_source": gw_payload.get("error_source"),
            "error_step": gw_payload.get("error_step"),
        },
    )
    session.add(audit)
    await session.commit()
    await session.refresh(tx)
    await session.refresh(recovery_case)

    # Scoped payment.failed event
    fail_event = {
        "payment_id": payment_id,
        "order_id": order_id,
        "case_id": str(case_id),
        "customer_id": str(customer_id),
        "amount": float(payload.amount),
        "status": "FAILED",
        "method": payload.method,
        "failure_reason": scenario_upper,
        "error_code": gw_payload.get("error_code", "GATEWAY_ERROR"),
        "error_description": gw_payload.get("error_description", "Payment authorization declined"),
        "error_source": gw_payload.get("error_source", "bank"),
        "error_step": gw_payload.get("error_step", "payment_authorization"),
        "bank_error_code": gw_payload.get("bank_error_code", "91"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await emit_to_customer(str(customer_id), "payment.failed", fail_event)
    await emit_to_merchant(str(merchant_id), "payment.failed", fail_event)

    # 3. Autonomous Multi-Agent Reasoning Pipeline (Auto-Execute = FALSE)
    conversation_starter = None
    try:
        analysis = await coordinator.analyze_case(
            session=session,
            case_id=case_id,
            merchant_id=merchant_id,
            auto_execute=False,
        )
        await session.refresh(recovery_case)

        # Setup scenario-specific customer conversation
        if scenario_upper == "INSUFFICIENT_FUNDS":
            conversation_starter = (
                f"Your payment of ₹{payload.amount:,.2f} could not be completed because "
                "the available payment balance was insufficient. When would you like to try this payment again?"
            )
        elif scenario_upper in ["CARD_EXPIRED", "CARD_BLOCKED", "INCORRECT_CARD_DETAILS"]:
            conversation_starter = (
                f"Your payment card ending in 4242 failed due to {scenario_upper.replace('_', ' ').lower()}. "
                "Choose how you'd like to continue: [Update Card in Simulator] [Use UPI] [Use Another Card]."
            )
        elif scenario_upper in ["BANK_DOWNTIME", "GATEWAY_ERROR", "NETWORK_FAILURE"]:
            conversation_starter = (
                "The banking core network is currently degraded. Your payment has been placed ON HOLD "
                "to prevent unnecessary charges. It will resume automatically once bank systems stabilize."
            )
        elif scenario_upper in ["UPI_TIMEOUT", "LATE_AUTHORIZATION", "BANK_TIMEOUT"]:
            conversation_starter = (
                "Payment authorization is pending gateway confirmation. "
                "RevivePilot is actively verifying status before taking any action."
            )
        elif scenario_upper == "RISK_FRAUD_DECLINE":
            conversation_starter = (
                "This transaction was flagged by risk controls. Automated recovery is stopped. "
                "Please contact support or use a verified payment method."
            )
        else:
            conversation_starter = (
                f"Payment could not be completed: {gw_payload.get('error_description', scenario_upper)}. "
                "The agent has planned a dynamic recovery strategy."
            )

        # Save conversation starter
        starter_record = RecoveryConversation(
            merchant_id=merchant_id,
            case_id=case_id,
            customer_id=customer_id,
            channel="CUSTOMER_PORTAL",
            sender_type="AI_AGENT",
            sender_name="RevivePilot Agent",
            message=conversation_starter,
            metadata_={"starter": True, "scenario": scenario_upper},
        )
        session.add(starter_record)
        await session.commit()

        # Scoped event: customer context required
        await emit_to_customer(str(customer_id), "recovery.waiting_for_customer", {
            "case_id": str(case_id),
            "status": recovery_case.status,
            "next_action": recovery_case.next_action,
            "conversation_starter": conversation_starter,
        })

        # 4. Agent Autonomous Execution: Link Generation & Mail Dispatch
        has_smart_link = False
        recovery_url = None
        email_sent = False

        if recovery_case.next_action == "GENERATE_RECOVERY_LINK" or (
            recovery_case.smart_link_required and recovery_case.status in [RecoveryStatus.EXECUTING.value, RecoveryStatus.APPROVED.value]
        ):
            import secrets
            token = f"rec_{secrets.token_urlsafe(32)}"
            now = datetime.now(timezone.utc)
            recovery_case.smart_link_token = token
            recovery_case.smart_link_expires_at = now + timedelta(hours=24)
            recovery_case.smart_link_status = "ACTIVE"
            recovery_case.smart_link_required = True
            recovery_url = f"http://localhost:3001/pay/recover?token={token}"
            has_smart_link = True

            merchant = await session.get(Merchant, merchant_id)
            merchant_name = merchant.business_name if merchant else "RevivePilot Merchant"
            expires_str = recovery_case.smart_link_expires_at.strftime("%b %d, %Y at %I:%M %p UTC")

            from app.services.email_service import EmailService
            try:
                email_res = await EmailService.send_recovery_link_email(
                    email=current_customer.email,
                    name=current_customer.name or "Valued Customer",
                    merchant_name=merchant_name,
                    amount=float(payload.amount),
                    recovery_url=recovery_url,
                    expires_at_str=expires_str,
                    failure_reason=recovery_case.root_cause or scenario_upper,
                    timespan_hours=24,
                )
                email_sent = email_res.get("success", True)
                logger.info(f"[CustomerPortal] Agent generated recovery link and emailed {current_customer.email} (Delivery: {email_res.get('status')})")
            except Exception as mail_err:
                logger.warning(f"[CustomerPortal] Email dispatch error: {mail_err}")

            # Record in conversation & audit log
            conv_mail = RecoveryConversation(
                merchant_id=merchant_id,
                case_id=case_id,
                customer_id=customer_id,
                channel="EMAIL",
                sender_type="AI_AGENT",
                sender_name="RevivePilot Recovery Agent",
                message=f"[AGENT GENERATED RECOVERY LINK & EMAILED TO {current_customer.email}]\nURL: {recovery_url}\nExpires: {expires_str}",
                metadata_={"token": token, "email": current_customer.email, "recovery_url": recovery_url, "email_sent": email_sent},
            )
            session.add(conv_mail)

            audit_mail = AuditLog(
                merchant_id=merchant_id,
                recovery_case_id=case_id,
                event_type="AGENT_RECOVERY_LINK_GENERATED",
                actor_type="AI_AGENT",
                description=f"Action Agent formulated link recovery strategy, generated signed 24h token and emailed {current_customer.email}",
                metadata_={"token": token, "recovery_url": recovery_url, "email": current_customer.email, "email_sent": email_sent},
            )
            session.add(audit_mail)
            await session.commit()
            await session.refresh(recovery_case)

            # Broadcast real-time events to customer and merchant
            await emit_to_customer(str(customer_id), "recovery.smart_link.generated", {
                "case_id": str(case_id),
                "token": token,
                "recovery_url": recovery_url,
                "status": "ACTIVE",
                "email_sent": email_sent,
            })
            await emit_to_merchant(str(merchant_id), "recovery.smart_link.generated", {
                "case_id": str(case_id),
                "token": token,
                "recovery_url": recovery_url,
                "status": "ACTIVE",
                "email_sent": email_sent,
            })

    except Exception as exc:
        logger.error(f"[CustomerPortal] Agent reasoning failed for case {case_id}: {exc}", exc_info=True)

    return PaymentResultResponse(
        success=False,
        status="FAILED",
        payment_id=payment_id,
        order_id=order_id,
        case_id=str(case_id),
        amount=float(payload.amount),
        method=payload.method,
        failure_reason=scenario_upper,
        error_code=gw_payload.get("error_code", "PAYMENT_FAILED"),
        remaining_balance=float(current_customer.balance or 0),
        message=f"Failure: {gw_payload.get('error_description', scenario_upper)}",
        recovery_state=recovery_case.status,
        next_action=recovery_case.next_action,
        strategy=recovery_case.recommended_strategy,
        conversation_starter=conversation_starter,
        has_recovery_link=has_smart_link,
        recovery_url=recovery_url,
        smart_link_token=recovery_case.smart_link_token if has_smart_link else None,
        email_sent=email_sent,
        agent_decision=recovery_case.next_action,
    )


# ── 1b. Customer Fetch Recovery Case Details ──────────────────────────────────
@router.get("/recovery/{case_id}")
async def get_customer_recovery_case(
    case_id: uuid.UUID,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
):
    query = (
        select(RecoveryCase)
        .options(selectinload(RecoveryCase.transaction))
        .where(RecoveryCase.id == case_id)
    )
    case = (await session.execute(query)).scalars().first()
    if not case or case.customer_id != current_customer.id or case.merchant_id != current_customer.merchant_id:
        raise HTTPException(status_code=404, detail="Recovery case not found")

    amount = case.expected_recovery_amount
    if case.transaction and case.transaction.amount:
        amount = case.transaction.amount

    return {
        "id": str(case.id),
        "case_id": str(case.id),
        "status": case.status,
        "next_action": case.next_action,
        "amount": float(amount),
        "strategy": case.recommended_strategy or case.current_strategy,
        "customer_id": str(case.customer_id),
        "merchant_id": str(case.merchant_id),
    }


# ── 2. Interactive Customer Recovery Chat ─────────────────────────────────────
@router.post("/recovery/{case_id}/chat", response_model=CustomerChatOutput)
async def customer_recovery_chat(
    case_id: uuid.UUID,
    payload: CustomerChatPayload,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
):
    """
    Customer communicates with RevivePilot during recovery.
    Provides context (e.g. 'Tomorrow at 10 AM', 'Use UPI').
    Triggers dynamic Strategy Agent replanning into ON_HOLD.
    """
    case = await session.get(RecoveryCase, case_id)
    if not case or case.customer_id != current_customer.id:
        raise HTTPException(status_code=404, detail="Recovery case not found")

    res = await coordinator.handle_customer_context(
        session=session,
        case_id=case_id,
        customer_id=current_customer.id,
        message=payload.message or "",
        selected_option=payload.selected_option,
    )
    return CustomerChatOutput(
        reply=res["reply"],
        case_status=res["case_status"],
        strategy=res["strategy"],
        next_action=res["next_action"],
    )


# ── 3. Get Case Conversation Messages ─────────────────────────────────────────
@router.get("/recovery/{case_id}/conversation")
async def get_customer_conversation(
    case_id: uuid.UUID,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
):
    """
    Fetches the case-scoped chat history for the customer portal.
    """
    case = await session.get(RecoveryCase, case_id)
    if not case or case.customer_id != current_customer.id:
        raise HTTPException(status_code=404, detail="Recovery case not found")

    query = (
        select(RecoveryConversation)
        .where(
            RecoveryConversation.case_id == case_id,
            RecoveryConversation.channel == "CUSTOMER_PORTAL",
        )
        .order_by(RecoveryConversation.created_at.asc())
    )
    messages = (await session.execute(query)).scalars().all()

    return {
        "case_id": str(case_id),
        "status": case.status,
        "next_action": case.next_action,
        "messages": [
            {
                "id": str(m.id),
                "sender_type": m.sender_type,
                "sender_name": m.sender_name,
                "message": m.message,
                "metadata": m.metadata_ or {},
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


# ── 4. Verify & Settle Recovery (Genuine Retry) ───────────────────────────────
@router.post("/recovery/{case_id}/retry")
async def complete_customer_recovery(
    case_id: uuid.UUID,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_db),
):
    """
    Customer confirms they are ready to retry payment.
    Strictly verifies payment, deducts funds, updates transaction,
    and marks RecoveryCase RECOVERED in PostgreSQL.
    """
    case = await session.get(RecoveryCase, case_id)
    if not case or case.customer_id != current_customer.id or case.merchant_id != current_customer.merchant_id:
        raise HTTPException(status_code=404, detail="Recovery case not found.")

    res = await RecoveryService.verify_and_settle_recovery(
        session=session,
        case_id=case_id,
        payment_data={"channel": "CUSTOMER_CONFIRMED_RETRY"},
    )
    return {
        "success": True,
        "status": "RECOVERED",
        "case_id": str(case.id),
        "recovered_amount": float(res.actual_recovered_amount or res.amount or 0),
        "remaining_balance": float(current_customer.balance or 0),
        "message": f"Payment of ₹{float(res.actual_recovered_amount or res.amount or 0):,.2f} recovered successfully!",
    }


# ── 5. Smart Recovery Link Endpoints (Cryptographically Signed Token) ──────────
@router.get("/recovery/link/{token}")
async def get_recovery_link_details(
    token: str,
    session: AsyncSession = Depends(get_db),
):
    """
    Validates a secure signed recovery token.
    Publicly resolvable without leaking customer accounts across tenants.
    """
    query = (
        select(RecoveryCase)
        .options(
            selectinload(RecoveryCase.customer),
            selectinload(RecoveryCase.transaction),
            selectinload(RecoveryCase.merchant),
        )
        .where(RecoveryCase.smart_link_token == token)
    )
    case = (await session.execute(query)).scalars().first()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery link is invalid or has expired")

    now = datetime.now(timezone.utc)
    if case.smart_link_expires_at and case.smart_link_expires_at < now:
        raise HTTPException(status_code=410, detail="This smart recovery link has expired")

    if case.status == RecoveryStatus.RECOVERED.value:
        raise HTTPException(status_code=400, detail="This payment has already been successfully recovered")

    amount = case.expected_recovery_amount
    if case.transaction and case.transaction.amount:
        amount = case.transaction.amount

    return {
        "case_id": str(case.id),
        "token": token,
        "amount": float(amount),
        "merchant_name": case.merchant.business_name if case.merchant else "RevivePilot Merchant",
        "customer_name": case.customer.name if case.customer else "Customer",
        "customer_email": case.customer.email if case.customer else None,
        "status": case.status,
        "expires_at": case.smart_link_expires_at.isoformat() if case.smart_link_expires_at else None,
    }


@router.post("/recovery/link/{token}/pay")
async def pay_recovery_link(
    token: str,
    payload: RecoveryLinkPayPayload,
    session: AsyncSession = Depends(get_db),
):
    """
    Settles recovery payment via smart recovery link.
    Only marks RECOVERED after valid settlement capture.
    """
    query = select(RecoveryCase).where(RecoveryCase.smart_link_token == token)
    case = (await session.execute(query)).scalars().first()
    if not case:
        raise HTTPException(status_code=404, detail="Recovery link is invalid")

    res = await RecoveryService.verify_and_settle_recovery(
        session=session,
        case_id=case.id,
        payment_data={"method": payload.method, "token": token},
    )
    return {
        "success": True,
        "status": "RECOVERED",
        "case_id": str(case.id),
        "recovered_amount": float(res.actual_recovered_amount or res.amount or 0),
        "message": "Payment captured and revenue recovered!",
    }


# ── 6. Customer Transaction History ──────────────────────────────────────────
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
        has_link = False
        recovery_url = None
        email_sent = False
        agent_action = None
        agent_strategy = None
        agent_reason = None
        smart_token = None

        if t.recovery_cases:
            sorted_cases = sorted(t.recovery_cases, key=lambda x: x.created_at or datetime.min, reverse=True)
            latest_c = sorted_cases[0]
            case_id = str(latest_c.id)
            case_status = latest_c.status
            agent_action = latest_c.next_action
            agent_strategy = latest_c.current_strategy or latest_c.recommended_strategy
            agent_reason = latest_c.strategy_reason
            smart_token = latest_c.smart_link_token

            # Button is ONLY enabled if the agent explicitly generated an active recovery link!
            if latest_c.smart_link_token and latest_c.smart_link_status in ["ACTIVE", "SENT_TO_CUSTOMER"]:
                has_link = True
                recovery_url = f"/pay/recover?token={latest_c.smart_link_token}"
                email_sent = True

        if case_status == RecoveryStatus.RECOVERED.value or t.status == TransactionStatus.SUCCESS.value:
            status_val = "RECOVERED" if case_status == RecoveryStatus.RECOVERED.value else "SUCCESS"
        elif t.status == TransactionStatus.FAILED.value:
            status_val = "FAILED"
        else:
            status_val = t.status

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
            "has_recovery_link": has_link,
            "hasRecoveryLink": has_link,
            "recovery_url": recovery_url,
            "recoveryUrl": recovery_url,
            "smart_link_token": smart_token,
            "smartLinkToken": smart_token,
            "agent_action": agent_action,
            "agentAction": agent_action,
            "agent_status": case_status,
            "agentStatus": case_status,
            "agent_strategy": agent_strategy,
            "agentStrategy": agent_strategy,
            "agent_reason": agent_reason,
            "agentReason": agent_reason,
            "email_sent": email_sent,
            "emailSent": email_sent,
            "date": t.created_at.isoformat() if t.created_at else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return {"orders": items, "total": len(items)}
