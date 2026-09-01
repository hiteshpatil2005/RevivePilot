import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any, Tuple
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.transaction import Transaction, TransactionStatus
from app.models.payment_event import PaymentEvent
from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.payments.state_machine import PaymentStateMachine
from app.recovery.risk_engine import DeterministicRiskEngine
from app.events.publisher import event_publisher
from app.websocket.manager import ws_manager
from app.core.logging import logger


class PaymentEventService:
    @staticmethod
    async def process_payment_event(
        session: AsyncSession,
        merchant_id: uuid.UUID,
        event_type: str,
        transaction_id: Optional[uuid.UUID] = None,
        customer_id: Optional[uuid.UUID] = None,
        amount: Optional[Decimal] = None,
        currency: str = "INR",
        payment_method: str = "CARD",
        failure_reason: Optional[str] = None,
        source: str = "MANUAL",
        idempotency_key: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PaymentEvent:
        """
        Idempotent payment event ingestion pipeline with transaction state machine,
        deterministic risk detection, recovery case generation, and real-time streaming.
        """
        # 1. Idempotency Check
        if idempotency_key:
            existing_event = await session.scalar(
                select(PaymentEvent).where(
                    PaymentEvent.merchant_id == merchant_id,
                    PaymentEvent.idempotency_key == idempotency_key,
                )
            )
            if existing_event:
                logger.info(f"Idempotent duplicate event returned: {existing_event.id}")
                return existing_event

        # 2. Derive new status from event type
        ev_upper = event_type.upper()
        if "FAILED" in ev_upper:
            new_status = TransactionStatus.FAILED.value
        elif "SUCCESS" in ev_upper:
            new_status = TransactionStatus.SUCCESS.value
        elif "CANCELLED" in ev_upper:
            new_status = TransactionStatus.CANCELLED.value
        elif "REFUNDED" in ev_upper:
            new_status = TransactionStatus.REFUNDED.value
        elif "PENDING" in ev_upper:
            new_status = TransactionStatus.PENDING.value
        else:
            new_status = TransactionStatus.CREATED.value

        # 3. Locate or Create Transaction
        transaction = None
        previous_status = None

        if transaction_id:
            transaction = await session.scalar(
                select(Transaction).where(
                    Transaction.id == transaction_id,
                    Transaction.merchant_id == merchant_id,
                )
            )
            if not transaction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Transaction {transaction_id} not found for this merchant.",
                )
            previous_status = transaction.status
            # Validate legal state machine transition
            PaymentStateMachine.validate_transition(previous_status, new_status)
            transaction.status = new_status
            if failure_reason:
                transaction.failure_reason = failure_reason
            if amount:
                transaction.amount = amount
            transaction.updated_at = datetime.now(timezone.utc)
        else:
            # Create new transaction if none specified
            if not customer_id:
                # Pick or create a default customer for this merchant
                cust = await session.scalar(
                    select(Customer).where(Customer.merchant_id == merchant_id).limit(1)
                )
                if not cust:
                    cust = Customer(
                        id=uuid.uuid4(),
                        merchant_id=merchant_id,
                        name="Demo Customer",
                        email="demo.customer@example.com",
                        phone="+91 98765 43210",
                        external_customer_id="cust_auto",
                    )
                    session.add(cust)
                    await session.flush()
                customer_id = cust.id

            amt = amount or Decimal("25000.00")
            transaction = Transaction(
                id=uuid.uuid4(),
                merchant_id=merchant_id,
                customer_id=customer_id,
                external_payment_id=f"pay_{uuid.uuid4().hex[:10]}",
                amount=amt,
                currency=currency,
                status=new_status,
                payment_method=payment_method,
                failure_reason=failure_reason,
                created_at=datetime.now(timezone.utc),
            )
            session.add(transaction)
            await session.flush()

        # 4. Create PaymentEvent record
        event_id = f"evt_{uuid.uuid4().hex[:14]}"
        payment_event = PaymentEvent(
            id=event_id,
            merchant_id=merchant_id,
            transaction_id=transaction.id,
            event_type=event_type,
            previous_status=previous_status,
            new_status=new_status,
            amount=transaction.amount,
            currency=currency,
            failure_reason=failure_reason or transaction.failure_reason,
            payment_method=payment_method or transaction.payment_method,
            source=source,
            idempotency_key=idempotency_key,
            metadata_=metadata or {},
            created_at=datetime.now(timezone.utc),
        )
        session.add(payment_event)

        # 5. Risk Assessment and Recovery Case Handling
        recovery_case = None
        if new_status == TransactionStatus.FAILED.value:
            # Evaluate deterministic risk
            risk_result = DeterministicRiskEngine.evaluate(
                amount=transaction.amount,
                failure_reason=transaction.failure_reason,
            )

            # Prevent duplicate active recovery cases for the same transaction
            existing_case = await session.scalar(
                select(RecoveryCase).where(
                    RecoveryCase.transaction_id == transaction.id,
                    RecoveryCase.merchant_id == merchant_id,
                )
            )

            if existing_case:
                existing_case.attempt_count += 1
                existing_case.risk_score = risk_result.risk_score
                existing_case.updated_at = datetime.now(timezone.utc)
                recovery_case = existing_case
            else:
                recovery_case = RecoveryCase(
                    id=uuid.uuid4(),
                    merchant_id=merchant_id,
                    transaction_id=transaction.id,
                    customer_id=transaction.customer_id,
                    status=RecoveryStatus.DETECTED.value,
                    risk_score=risk_result.risk_score,
                    recovery_probability=int(risk_result.recovery_probability * 100),
                    root_cause=transaction.failure_reason or "UNKNOWN_FAILURE",
                    recommended_strategy=risk_result.recommended_strategy,
                    expected_recovery_amount=risk_result.expected_recovery_amount,
                    actual_recovered_amount=Decimal("0.00"),
                    attempt_count=0,
                    max_attempts=3,
                    created_at=datetime.now(timezone.utc),
                )
                session.add(recovery_case)
                await session.flush()

                # Create notification if high risk
                if risk_result.risk_score >= 80:
                    session.add(
                        Notification(
                            id=uuid.uuid4(),
                            merchant_id=merchant_id,
                            type="ALERT",
                            title=f"High Risk Failure: ₹{transaction.amount:,.2f}",
                            message=f"Transaction {transaction.external_payment_id} flagged ({transaction.failure_reason}). Case created.",
                            read=False,
                            metadata_={"case_id": str(recovery_case.id), "amount": float(transaction.amount)},
                        )
                    )

            # Audit Log for Failure & Risk
            session.add(
                AuditLog(
                    id=uuid.uuid4(),
                    merchant_id=merchant_id,
                    recovery_case_id=recovery_case.id,
                    event_type="PAYMENT_FAILED",
                    actor_type="SYSTEM",
                    description=f"Payment {transaction.external_payment_id} failed ({transaction.failure_reason or 'UNKNOWN'})",
                    metadata_={"amount": float(transaction.amount), "risk_score": risk_result.risk_score},
                )
            )

        elif new_status == TransactionStatus.SUCCESS.value:
            # Check if there is an existing recovery case that succeeded
            active_case = await session.scalar(
                select(RecoveryCase).where(
                    RecoveryCase.transaction_id == transaction.id,
                    RecoveryCase.merchant_id == merchant_id,
                )
            )
            if active_case:
                active_case.status = RecoveryStatus.RECOVERED.value
                active_case.actual_recovered_amount = transaction.amount
                active_case.resolved_at = datetime.now(timezone.utc)
                recovery_case = active_case

                session.add(
                    AuditLog(
                        id=uuid.uuid4(),
                        merchant_id=merchant_id,
                        recovery_case_id=active_case.id,
                        event_type="RECOVERY_SUCCESS",
                        actor_type="SYSTEM",
                        description=f"Transaction {transaction.external_payment_id} successfully recovered. ₹{transaction.amount:,.2f} preserved.",
                        metadata_={"amount": float(transaction.amount)},
                    )
                )

        # Commit DB transaction atomically
        await session.commit()

        # 6. Publish to Redis and WebSocket
        event_payload = {
            "event_id": payment_event.id,
            "event_type": f"payment.{new_status.lower()}",
            "timestamp": payment_event.created_at.isoformat(),
            "merchant_id": str(merchant_id),
            "entity_id": str(transaction.id),
            "data": {
                "transaction_id": str(transaction.id),
                "external_payment_id": transaction.external_payment_id,
                "amount": float(transaction.amount),
                "currency": transaction.currency,
                "status": new_status,
                "payment_method": transaction.payment_method,
                "failure_reason": transaction.failure_reason,
                "case_id": str(recovery_case.id) if recovery_case else None,
                "risk_score": recovery_case.risk_score if recovery_case else None,
                "strategy": recovery_case.recommended_strategy if recovery_case else None,
            },
        }

        # Redis Pub/Sub
        await event_publisher.publish_raw(
            channel=f"revivepilot:merchant:{merchant_id}",
            payload=event_payload,
        )

        # Direct WebSocket push to active connections for this merchant
        await ws_manager.send_to_merchant(merchant_id, event_payload)

        return payment_event
