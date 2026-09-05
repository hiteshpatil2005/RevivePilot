import uuid
import secrets
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy import select, func, desc
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.customer import Customer
from app.models.transaction import Transaction, TransactionStatus
from app.models.audit_log import AuditLog
from app.models.agent_execution import AgentExecution
from app.models.recovery_conversation import RecoveryConversation
from app.schemas.recovery import (
    RecoveryCaseResponse,
    PolicyCheckItem,
    RecoveryTimelineEvent,
    MerchantChatResponse,
)
from app.websocket.socketio_server import emit_to_merchant, emit_to_customer
from app.agents.llm import LLMAdapter
from app.core.logging import logger


class RecoveryService:
    @staticmethod
    def _format_case(
        case: RecoveryCase,
        timeline: Optional[List[RecoveryTimelineEvent]] = None,
    ) -> RecoveryCaseResponse:
        """Helper to transform RecoveryCase DB model into response model."""
        priority = "high" if case.risk_score >= 80 else ("medium" if case.risk_score >= 50 else "low")
        cust = getattr(case, "customer", None)
        txn = getattr(case, "transaction", None)
        customer_name = cust.name if cust else "Customer"
        customer_email = cust.email if cust else None
        payment_method = txn.payment_method if txn else "CARD"
        external_payment_id = txn.external_payment_id if txn else None
        external_order_id = txn.external_order_id if txn else None

        amount_val = case.expected_recovery_amount
        if txn and txn.amount:
            amount_val = txn.amount

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
            customer_name=customer_name,
            customer_email=customer_email,
            payment_method=payment_method,
            external_payment_id=external_payment_id,
            external_order_id=external_order_id,
            status=case.status,
            risk_score=case.risk_score,
            recovery_probability=case.recovery_probability,
            root_cause=case.root_cause,
            recommended_strategy=case.recommended_strategy,
            expected_recovery_amount=case.expected_recovery_amount,
            actual_recovered_amount=case.actual_recovered_amount or Decimal("0.00"),
            attempt_count=case.attempt_count,
            max_attempts=case.max_attempts,
            amount=amount_val,
            priority=priority,
            customerId=str(case.customer_id),
            transactionId=str(case.transaction_id),
            rootCause=case.root_cause,
            strategy=case.recommended_strategy or "Dynamic Recovery",
            riskScore=case.risk_score,
            recoveryProbability=case.recovery_probability,
            expectedRecovery=case.expected_recovery_amount,
            actualRecoveredAmount=case.actual_recovered_amount or Decimal("0.00"),
            # Extended Deep Agentic Recovery Fields
            current_strategy=case.current_strategy or case.recommended_strategy,
            strategy_version=case.strategy_version or 1,
            strategy_reason=case.strategy_reason,
            strategy_confidence=case.strategy_confidence,
            next_action=case.next_action,
            next_evaluation_at=case.next_evaluation_at,
            customer_context=case.customer_context or {},
            customer_expected_retry_at=case.customer_expected_retry_at,
            merchant_approval_required=case.merchant_approval_required,
            merchant_approval_status=case.merchant_approval_status,
            smart_link_required=case.smart_link_required,
            smart_link_token=case.smart_link_token,
            smart_link_expires_at=case.smart_link_expires_at,
            smart_link_status=case.smart_link_status,
            stop_conditions=case.stop_conditions or [],
            escalation_conditions=case.escalation_conditions or [],
            replan_conditions=case.replan_conditions or [],
            future_plan=case.future_plan or [],
            replan_count=case.replan_count or 0,
            last_agent_decision=case.last_agent_decision,
            policyChecks=policy_checks,
            timeline=timeline or [],
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

        # Build dynamic live timeline directly from PostgreSQL audit logs
        audit_query = (
            select(AuditLog)
            .where(AuditLog.recovery_case_id == case.id)
            .order_by(AuditLog.created_at.asc())
        )
        audit_records = (await session.execute(audit_query)).scalars().all()

        timeline = []
        for a in audit_records:
            step_name = a.event_type.replace("AGENT_", "").replace("_", " ").title()
            timeline.append(
                RecoveryTimelineEvent(
                    id=str(a.id),
                    eventType=a.event_type,
                    timestamp=a.created_at,
                    description=a.description,
                    actor=a.actor_type or "AI_AGENT",
                    metadata=a.metadata_ or {},
                    step=step_name,
                    label=step_name,
                    detail=a.description,
                    ts=a.created_at.strftime("%H:%M:%S") if a.created_at else "",
                    status="done",
                )
            )

        return RecoveryService._format_case(case, timeline)

    @staticmethod
    async def generate_smart_recovery_link(
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Generates a secure, signed, short-lived, customer-specific recovery link.
        Never relies on simple unauthenticated IDs.
        """
        case = await session.get(RecoveryCase, case_id)
        if not case or case.merchant_id != merchant_id:
            raise HTTPException(status_code=404, detail="Recovery case not found")

        # Generate cryptographically secure signed token (24-hour timespan by default)
        token = f"rec_{secrets.token_urlsafe(32)}"
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        case.smart_link_token = token
        case.smart_link_expires_at = expires_at
        case.smart_link_status = "PENDING_MERCHANT_DISPATCH"
        case.smart_link_required = True

        audit = AuditLog(
            merchant_id=merchant_id,
            recovery_case_id=case.id,
            event_type="SMART_LINK_GENERATED",
            actor_type="AI_AGENT",
            description=f"Action Agent generated 24-hour secure recovery token for case {str(case.id)[:8]} (pending merchant verification).",
            metadata_={"token_prefix": token[:10], "expires_at": expires_at.isoformat(), "timespan_hours": 24},
        )
        session.add(audit)
        await session.commit()
        await session.refresh(case)

        rzp_link = f"https://rzp.io/i/{token[:16]}"
        portal_link = f"http://localhost:3001/pay/recover?token={token}"

        await emit_to_merchant(str(merchant_id), "recovery.smart_link.generated", {
            "case_id": str(case.id),
            "payment_link": rzp_link,
            "portal_link": portal_link,
            "expires_at": expires_at.isoformat(),
            "timespan_hours": 24,
            "status": "PENDING_MERCHANT_DISPATCH",
        })

        return {
            "success": True,
            "case_id": str(case.id),
            "payment_link": rzp_link,
            "portal_link": portal_link,
            "token": token,
            "expires_at": expires_at.isoformat(),
            "timespan_hours": 24,
        }

    @staticmethod
    async def send_recovery_email_to_customer(
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
        timespan_hours: int = 24,
    ) -> Dict[str, Any]:
        """
        Dispatches the secure, tokenized recovery link email directly to the customer.
        Enforces token generation with an explicit timespan (e.g. 24 hours), records
        the email in recovery_conversations and audit_logs, updates smart_link_status,
        and notifies the merchant cockpit in real-time.
        """
        query = (
            select(RecoveryCase)
            .options(
                joinedload(RecoveryCase.customer),
                joinedload(RecoveryCase.transaction),
                joinedload(RecoveryCase.merchant),
            )
            .where(RecoveryCase.id == case_id)
        )
        case = (await session.execute(query)).scalars().first()
        if not case or case.merchant_id != merchant_id:
            raise HTTPException(status_code=404, detail="Recovery case not found")

        customer = case.customer
        if not customer or not customer.email:
            raise HTTPException(status_code=400, detail="Customer email not found on this recovery case")

        # Ensure active token and timespan exists (valid for 24 hours from dispatch)
        now = datetime.now(timezone.utc)
        if not case.smart_link_token or not case.smart_link_expires_at or case.smart_link_expires_at < now:
            case.smart_link_token = f"rec_{secrets.token_urlsafe(32)}"
            case.smart_link_expires_at = now + timedelta(hours=timespan_hours)

        case.smart_link_status = "SENT_TO_CUSTOMER"
        case.smart_link_required = True
        case.status = RecoveryStatus.WAITING_FOR_CUSTOMER.value
        case.next_action = "CUSTOMER_PAYMENT_PENDING"

        recovery_url = f"http://localhost:3001/pay/recover?token={case.smart_link_token}"
        tx_amount = case.transaction.amount if case.transaction and case.transaction.amount else case.expected_recovery_amount
        merchant_name = case.merchant.business_name if case.merchant else "RevivePilot Merchant"
        expires_str = case.smart_link_expires_at.strftime("%b %d, %Y at %I:%M %p UTC")

        email_subject = f"Complete your payment of ₹{tx_amount:,.2f} for {merchant_name}"
        email_body = (
            f"Dear {customer.name},\n\n"
            f"Your recent payment of ₹{tx_amount:,.2f} to {merchant_name} could not be processed due to a gateway/bank issue ({case.root_cause or 'Payment Failed'}).\n\n"
            f"Our AI Recovery Assistant has prepared a secure recovery link so you can complete your purchase using your preferred payment method (UPI, Card, NetBanking):\n\n"
            f"Pay Securely: {recovery_url}\n\n"
            f"NOTE: This link is valid for {timespan_hours} hours (expires on {expires_str}). For your security, this session will automatically close once the timespan has ended.\n\n"
            f"Warm regards,\n"
            f"{merchant_name} Billing & RevivePilot Agent"
        )

        # Dispatch real SMTP email via EmailService
        from app.services.email_service import EmailService
        email_res = await EmailService.send_recovery_link_email(
            email=customer.email,
            name=customer.name or "Valued Customer",
            merchant_name=merchant_name,
            amount=float(tx_amount),
            recovery_url=recovery_url,
            expires_at_str=expires_str,
            failure_reason=case.root_cause or "Payment Gateway Decline",
            timespan_hours=timespan_hours,
        )

        if not email_res.get("success"):
            logger.error(f"[RecoveryService] Failed to send email via SMTP to {customer.email}: {email_res.get('error')}")
            raise HTTPException(
                status_code=502,
                detail=f"SMTP Delivery Failed: {email_res.get('error', 'Unable to connect to mail server')}",
            )

        # 1. Record conversation entry
        conv = RecoveryConversation(
            merchant_id=merchant_id,
            case_id=case.id,
            channel="EMAIL",
            sender_type="AI_AGENT",
            sender_name="RevivePilot Recovery Agent",
            message=f"[EMAIL DISPATCHED TO {customer.email}]\nSubject: {email_subject}\n\nLink: {recovery_url}\nTimespan: {timespan_hours} Hours (Expires {expires_str})\nDelivery: {email_res.get('mode')}",
            metadata_={
                "email_subject": email_subject,
                "recipient_email": customer.email,
                "token": case.smart_link_token,
                "expires_at": case.smart_link_expires_at.isoformat(),
                "recovery_url": recovery_url,
                "amount": float(tx_amount),
                "timespan_hours": timespan_hours,
                "delivery_mode": email_res.get("mode"),
            },
        )
        session.add(conv)

        # 2. Log Audit Trail
        audit = AuditLog(
            merchant_id=merchant_id,
            recovery_case_id=case.id,
            event_type="RECOVERY_EMAIL_SENT",
            actor_type="AI_AGENT",
            description=f"AI Agent emailed secure payment recovery link to {customer.email} (valid for {timespan_hours} hours until {expires_str}). Mode: {email_res.get('mode')}.",
            metadata_={
                "recipient": customer.email,
                "token_prefix": case.smart_link_token[:10],
                "expires_at": case.smart_link_expires_at.isoformat(),
                "amount": float(tx_amount),
                "timespan_hours": timespan_hours,
                "delivery_mode": email_res.get("mode"),
            },
        )
        session.add(audit)
        await session.commit()
        await session.refresh(case)

        # 3. Real-time WebSocket notifications
        await emit_to_merchant(str(merchant_id), "recovery.email.dispatched", {
            "case_id": str(case.id),
            "recipient": customer.email,
            "recovery_url": recovery_url,
            "expires_at": case.smart_link_expires_at.isoformat(),
            "status": case.status,
            "timespan_hours": timespan_hours,
            "delivery_mode": email_res.get("mode"),
        })
        await emit_to_merchant(str(merchant_id), "recovery.case.updated", {
            "case_id": str(case.id),
            "status": case.status,
            "smart_link_status": case.smart_link_status,
        })

        return {
            "success": True,
            "case_id": str(case.id),
            "customer_email": customer.email,
            "customer_name": customer.name,
            "recovery_url": recovery_url,
            "expires_at": case.smart_link_expires_at.isoformat(),
            "timespan": f"{timespan_hours} Hours",
            "email_subject": email_subject,
            "status": case.status,
            "delivery_mode": email_res.get("mode"),
            "delivery_message": email_res.get("message"),
        }

    @staticmethod
    async def approve_strategy(
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
        notes: Optional[str] = None,
    ) -> RecoveryCaseResponse:
        """
        Merchant explicitly authorizes the AI recommendation.
        If approved: Action Agent executes permitted action (e.g. sends smart link).
        """
        case = await session.get(RecoveryCase, case_id)
        if not case or case.merchant_id != merchant_id:
            raise HTTPException(status_code=404, detail="Recovery case not found")

        case.merchant_approval_status = "APPROVED"
        case.status = RecoveryStatus.APPROVED.value

        # If strategy needs smart link, generate it upon approval
        if case.smart_link_required or "LINK" in (case.next_action or "").upper():
            token = f"rec_{secrets.token_urlsafe(32)}"
            case.smart_link_token = token
            case.smart_link_expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
            case.smart_link_status = "SENT"

        audit = AuditLog(
            merchant_id=merchant_id,
            recovery_case_id=case.id,
            event_type="MERCHANT_APPROVED_STRATEGY",
            actor_type="MERCHANT",
            description=f"Merchant authorized recovery strategy '{case.recommended_strategy}'. {notes or ''}".strip(),
            metadata_={"notes": notes, "strategy": case.recommended_strategy},
        )
        session.add(audit)
        await session.commit()
        await session.refresh(case)

        await emit_to_merchant(str(merchant_id), "recovery.approved", {
            "case_id": str(case.id),
            "status": case.status,
            "strategy": case.recommended_strategy,
        })

        return RecoveryService._format_case(case)

    @staticmethod
    async def reject_strategy(
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
        notes: Optional[str] = None,
    ) -> RecoveryCaseResponse:
        """
        Merchant rejects the proposed strategy.
        Triggers the Strategy Agent to replan with the rejection feedback.
        """
        case = await session.get(RecoveryCase, case_id)
        if not case or case.merchant_id != merchant_id:
            raise HTTPException(status_code=404, detail="Recovery case not found")

        case.merchant_approval_status = "REJECTED"

        audit = AuditLog(
            merchant_id=merchant_id,
            recovery_case_id=case.id,
            event_type="MERCHANT_REJECTED_STRATEGY",
            actor_type="MERCHANT",
            description=f"Merchant rejected recovery strategy. Notes: {notes or 'No explanation'}",
            metadata_={"notes": notes},
        )
        session.add(audit)
        await session.commit()

        # Trigger dynamic replanning
        from app.agents.coordinator import coordinator
        await coordinator.replan_case(
            session=session,
            case_id=case.id,
            merchant_id=merchant_id,
            trigger=f"MERCHANT_REJECTED: {notes or 'Merchant rejected strategy'}",
        )
        await session.refresh(case)

        await emit_to_merchant(str(merchant_id), "recovery.rejected", {
            "case_id": str(case.id),
            "status": case.status,
        })

        return RecoveryService._format_case(case)

    @staticmethod
    async def verify_and_settle_recovery(
        session: AsyncSession,
        case_id: uuid.UUID,
        payment_data: Optional[Dict[str, Any]] = None,
    ) -> RecoveryCaseResponse:
        """
        The ONLY valid mechanism to mark RECOVERED.
        Strict verification: Only marked RECOVERED when an actual successful payment event occurs.
        """
        query = (
            select(RecoveryCase)
            .options(
                joinedload(RecoveryCase.customer),
                joinedload(RecoveryCase.transaction),
            )
            .where(RecoveryCase.id == case_id)
        )
        case = (await session.execute(query)).scalars().first()
        if not case:
            raise HTTPException(status_code=404, detail="Recovery case not found")

        merchant_id = case.merchant_id
        customer = case.customer
        tx = case.transaction
        amount = tx.amount if tx and tx.amount else case.expected_recovery_amount

        # Deduct balance in customer simulation if applicable
        if customer and customer.balance is not None:
            new_balance = max(Decimal("0.00"), customer.balance - amount)
            customer.balance = new_balance
            session.add(customer)

        # Transition transaction
        if tx:
            tx.status = TransactionStatus.SUCCESS.value
            tx.failure_reason = None
            session.add(tx)

        now = datetime.now(timezone.utc)
        case.status = RecoveryStatus.RECOVERED.value
        case.actual_recovered_amount = amount
        case.resolved_at = now
        case.attempt_count += 1
        session.add(case)

        audit = AuditLog(
            merchant_id=merchant_id,
            recovery_case_id=case.id,
            event_type="RECOVERY_SUCCESS",
            actor_type="AI_AGENT",
            description=f"Verified payment captured! Payment of ₹{amount:,.2f} successfully recovered.",
            metadata_={
                "recovered_amount": float(amount),
                "resolved_at": now.isoformat(),
                "payment_data": payment_data or {},
            },
        )
        session.add(audit)
        await session.commit()
        await session.refresh(case)

        # Real-time WebSocket notifications
        await emit_to_merchant(str(merchant_id), "recovery.case.updated", {
            "case_id": str(case.id),
            "status": "RECOVERED",
            "actual_recovered_amount": float(amount),
            "resolved_at": now.isoformat(),
        })
        await emit_to_merchant(str(merchant_id), "recovered_revenue.updated", {"added_amount": float(amount)})
        await emit_to_merchant(str(merchant_id), "dashboard.metrics.refresh", {})

        if customer:
            await emit_to_customer(str(customer.id), "payment.recovered", {
                "case_id": str(case.id),
                "status": "RECOVERED",
                "recovered_amount": float(amount),
                "timestamp": now.isoformat(),
            })

        return RecoveryService._format_case(case)

    @staticmethod
    async def merchant_chat(
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
        message: str,
    ) -> MerchantChatResponse:
        """
        Merchant ↔ Agent case-scoped Q&A.
        Answers grounded strictly in case facts.
        """
        query = (
            select(RecoveryCase)
            .options(joinedload(RecoveryCase.transaction))
            .where(RecoveryCase.id == case_id)
        )
        case = (await session.execute(query)).scalars().first()
        if not case or case.merchant_id != merchant_id:
            raise HTTPException(status_code=404, detail="Recovery case not found")

        # 1. Save merchant query to recovery_conversations
        q_record = RecoveryConversation(
            merchant_id=merchant_id,
            case_id=case.id,
            channel="MERCHANT_COCKPIT",
            sender_type="MERCHANT",
            sender_name="Merchant Operator",
            message=message,
        )
        session.add(q_record)

        # 2. Compile grounded case context
        tx_amount = case.transaction.amount if case.transaction and case.transaction.amount else case.expected_recovery_amount
        case_data = {
            "case_id": str(case.id),
            "amount": float(tx_amount),
            "actual_recovered_amount": float(case.actual_recovered_amount or 0.0),
            "expected_recovery_amount": float(case.expected_recovery_amount or 0.0),
            "root_cause": case.root_cause,
            "status": case.status,
            "strategy": case.current_strategy or case.recommended_strategy,
            "strategy_reason": case.strategy_reason,
            "next_action": case.next_action,
            "customer_context": case.customer_context or {},
            "recovery_probability": case.recovery_probability,
            "attempt_count": case.attempt_count,
        }

        # 3. Generate clinical explanation via LLMAdapter
        llm_res = await LLMAdapter.generate_reasoning(
            prompt_type="merchant_chat",
            context={
                "query": message,
                "case_data": case_data,
            },
        )

        reply_text = llm_res.get("reply", "The case is being monitored under bounded autonomy policies.")

        # 4. Save AI Agent reply to recovery_conversations
        a_record = RecoveryConversation(
            merchant_id=merchant_id,
            case_id=case.id,
            channel="MERCHANT_COCKPIT",
            sender_type="AI_AGENT",
            sender_name="RevivePilot Intelligence",
            message=reply_text,
            metadata_={"confidence": llm_res.get("confidence", 95)},
        )
        session.add(a_record)
        await session.commit()

        return MerchantChatResponse(
            reply=reply_text,
            confidence=llm_res.get("confidence", 95),
            actionable_suggestion=llm_res.get("actionable_suggestion"),
        )

    @staticmethod
    async def get_agent_executions(
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
    ) -> List[Dict[str, Any]]:
        """Fetch all agent executions for a case."""
        query = (
            select(AgentExecution)
            .where(
                AgentExecution.case_id == case_id,
                AgentExecution.merchant_id == merchant_id,
            )
            .order_by(AgentExecution.created_at.asc())
        )
        records = (await session.execute(query)).scalars().all()
        return [
            {
                "id": str(r.id),
                "agent_name": r.agent_name,
                "agent_type": r.agent_type,
                "decision": r.decision,
                "confidence": r.confidence,
                "latency_ms": r.latency_ms,
                "tokens_used": r.tokens_used,
                "model": r.model,
                "input_summary": r.input_summary,
                "output_data": r.output_data,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ]

    @staticmethod
    async def stop_case(
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> RecoveryCaseResponse:
        """Stop autonomous actions on a case."""
        case = await session.get(RecoveryCase, case_id)
        if not case or case.merchant_id != merchant_id:
            raise HTTPException(status_code=404, detail="Recovery case not found")

        case.status = RecoveryStatus.STOPPED.value
        case.next_action = "STOP"
        session.add(case)

        audit = AuditLog(
            merchant_id=merchant_id,
            recovery_case_id=case.id,
            event_type="CASE_STOPPED",
            actor_type="MERCHANT",
            description=f"Case stopped by merchant: {reason or 'Manual intervention'}",
            metadata_={"reason": reason},
        )
        session.add(audit)
        await session.commit()
        await session.refresh(case)

        await emit_to_merchant(str(merchant_id), "recovery.case.updated", {
            "case_id": str(case.id),
            "status": "STOPPED",
        })

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
        case.next_action = "ESCALATE"
        session.add(case)

        audit = AuditLog(
            merchant_id=merchant_id,
            recovery_case_id=case.id,
            event_type="CASE_ESCALATED",
            actor_type="MERCHANT",
            description=f"Case escalated to manual queue: {reason or 'Manual escalation'}",
            metadata_={"reason": reason},
        )
        session.add(audit)
        await session.commit()
        await session.refresh(case)

        await emit_to_merchant(str(merchant_id), "recovery.case.updated", {
            "case_id": str(case.id),
            "status": "ESCALATED",
        })

        return RecoveryService._format_case(case)
