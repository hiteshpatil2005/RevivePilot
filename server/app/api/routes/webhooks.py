import json
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, Header, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import logger
from app.database.session import get_db
from app.models.merchant import Merchant
from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.audit_log import AuditLog
from app.models.transaction import Transaction
from app.payments.razorpay_client import RazorpayClient
from app.payments.event_service import PaymentEventService
from app.events.publisher import EventPublisher, EventType

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post(
    "/razorpay",
    status_code=status.HTTP_200_OK,
    summary="Ingest and process official Razorpay Webhooks with HMAC verification",
)
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    session: AsyncSession = Depends(get_db),
):
    """
    Ingests live or test Razorpay webhook events.
    Verifies the cryptographic HMAC-SHA256 signature against RAZORPAY_WEBHOOK_SECRET.
    """
    body_bytes = await request.body()

    # 1. Cryptographic Signature Verification
    if not x_razorpay_signature or not RazorpayClient.verify_webhook_signature(body_bytes, x_razorpay_signature):
        logger.warning("Rejected Razorpay webhook: Invalid or missing X-Razorpay-Signature")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Razorpay webhook signature",
        )

    # 2. Parse Webhook Envelope
    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Malformed JSON payload: {e}")

    event = payload.get("event")
    event_payload = payload.get("payload", {})
    logger.info(f"Received valid Razorpay webhook: {event}")

    # 3. Resolve Merchant (Default to primary merchant for single-merchant webhook test)
    merchant_res = await session.execute(select(Merchant).limit(1))
    merchant = merchant_res.scalars().first()
    if not merchant:
        merchant = Merchant(
            name="Demo Merchant",
            email=f"demo_{uuid.uuid4().hex[:6]}@revivepilot.internal",
            business_name="Demo Merchant Enterprise",
        )
        session.add(merchant)
        await session.commit()
        await session.refresh(merchant)

    # ----------------------------------------------------
    # Scenario A: Payment Failed (payment.failed)
    # ----------------------------------------------------
    if event == "payment.failed":
        payment_entity = event_payload.get("payment", {}).get("entity", {})
        amount_raw = payment_entity.get("amount", 0)
        amount = Decimal(str(amount_raw / 100.0))
        currency = payment_entity.get("currency", "INR")
        method = payment_entity.get("method", "card").upper()
        
        # Extract Razorpay error codes
        err_code = payment_entity.get("error_code") or "BAD_REQUEST_ERROR"
        err_reason = payment_entity.get("error_reason") or "payment_failed"
        err_desc = payment_entity.get("error_description") or "Payment authorization failed"

        # Map to internal failure code
        if "timeout" in err_reason.lower() or "timeout" in err_desc.lower():
            failure_reason = "BANK_TIMEOUT"
        elif "balance" in err_desc.lower() or "insufficient" in err_desc.lower():
            failure_reason = "INSUFFICIENT_FUNDS"
        elif "decline" in err_desc.lower() or "declined" in err_reason.lower():
            failure_reason = "CARD_DECLINED"
        elif "network" in err_desc.lower():
            failure_reason = "NETWORK_ERROR"
        else:
            failure_reason = "CARD_DECLINED"

        payment_id = payment_entity.get("id", f"pay_{uuid.uuid4().hex[:10]}")
        idem_key = f"rzp_evt_{payment_id}"

        # Ingest into PaymentEventService
        result_event = await PaymentEventService.process_payment_event(
            session=session,
            merchant_id=merchant.id,
            event_type="PAYMENT_FAILED",
            amount=amount,
            currency=currency,
            payment_method=method,
            failure_reason=failure_reason,
            source="WEBHOOK",
            idempotency_key=idem_key,
            metadata={
                "razorpay_payment_id": payment_id,
                "error_code": err_code,
                "error_reason": err_reason,
                "error_description": err_desc,
            },
        )

        return {
            "status": "processed",
            "event": event,
            "payment_id": payment_id,
            "recovery_initiated": True,
            "failure_reason": failure_reason,
        }

    # ----------------------------------------------------
    # Scenario B: Payment Captured / Settled (payment.captured / order.paid / payment_link.paid)
    # ----------------------------------------------------
    elif event in ["payment.captured", "order.paid", "payment_link.paid"]:
        payment_entity = (
            event_payload.get("payment", {}).get("entity", {})
            or event_payload.get("payment_link", {}).get("entity", {})
        )
        amount_raw = payment_entity.get("amount", 0)
        amount = Decimal(str(amount_raw / 100.0))
        payment_id = payment_entity.get("id", f"pay_{uuid.uuid4().hex[:10]}")
        notes = payment_entity.get("notes", {})
        case_id_str = notes.get("case_id")

        matched_case = None
        if case_id_str:
            try:
                target_uuid = uuid.UUID(case_id_str)
                matched_case = await session.get(RecoveryCase, target_uuid)
            except Exception:
                pass

        # Fallback: Find the most recent active/executing recovery case
        if not matched_case:
            case_res = await session.execute(
                select(RecoveryCase)
                .where(
                    RecoveryCase.merchant_id == merchant.id,
                    RecoveryCase.status.in_([
                        RecoveryStatus.DETECTED.value,
                        RecoveryStatus.ANALYZING.value,
                        RecoveryStatus.APPROVED.value,
                        RecoveryStatus.EXECUTING.value,
                    ])
                )
                .order_by(RecoveryCase.created_at.desc())
                .limit(1)
            )
            matched_case = case_res.scalars().first()

        if matched_case:
            # Transition to RECOVERED
            matched_case.status = RecoveryStatus.RECOVERED.value
            matched_case.actual_recovered_amount = amount
            matched_case.resolved_at = datetime.now(timezone.utc)

            # Record celebratory AuditLog
            audit = AuditLog(
                merchant_id=merchant.id,
                recovery_case_id=matched_case.id,
                event_type="RECOVERY_SUCCESS",
                actor_type="RAZORPAY_WEBHOOK",
                description=f"Revenue recovered! Razorpay webhook verified {event}. Amount INR {amount:,.2f} captured.",
                metadata_={
                    "event": event,
                    "razorpay_payment_id": payment_id,
                    "recovered_amount": float(amount),
                },
            )
            session.add(audit)
            await session.commit()

            # Broadcast live celebration to WebSockets
            await EventPublisher.publish_event(
                event_type=EventType.RECOVERY_SUCCESS,
                merchant_id=merchant.id,
                case_id=matched_case.id,
                data={
                    "amount": float(amount),
                    "recoveredAmount": float(amount),
                    "razorpayPaymentId": payment_id,
                    "detail": f"INR {amount:,.2f} successfully recovered via Razorpay settlement",
                },
            )

            return {
                "status": "processed",
                "event": event,
                "case_id": str(matched_case.id),
                "recovered": True,
                "amount": float(amount),
            }

        return {"status": "processed", "event": event, "case_matched": False}

    return {"status": "ignored", "event": event}


@router.post(
    "/razorpay/simulate",
    summary="Simulate a cryptographically signed Razorpay webhook for testing",
)
async def simulate_razorpay_webhook(
    event_type: str = "payment.failed",
    amount: float = 35000.0,
    failure_reason: str = "BANK_TIMEOUT",
    case_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """
    Developer / Buildathon simulation endpoint.
    Constructs a canonical Razorpay webhook envelope, calculates the valid HMAC-SHA256 signature,
    and forwards it through the webhook engine.
    """
    amount_paise = int(amount * 100)
    fake_payment_id = f"pay_{uuid.uuid4().hex[:14]}"

    if event_type == "payment.failed":
        payload = {
            "entity": "event",
            "account_id": "acc_demo_rzp",
            "event": "payment.failed",
            "contains": ["payment"],
            "payload": {
                "payment": {
                    "entity": {
                        "id": fake_payment_id,
                        "entity": "payment",
                        "amount": amount_paise,
                        "currency": "INR",
                        "status": "failed",
                        "method": "card",
                        "description": "Subscription Renewal",
                        "error_code": "BAD_REQUEST_ERROR",
                        "error_description": f"Transaction failed due to {failure_reason}",
                        "error_reason": failure_reason.lower(),
                        "notes": {"case_id": case_id or "—"},
                    }
                }
            },
            "created_at": int(datetime.now(timezone.utc).timestamp()),
        }
    else:  # payment.captured
        payload = {
            "entity": "event",
            "account_id": "acc_demo_rzp",
            "event": "payment.captured",
            "contains": ["payment"],
            "payload": {
                "payment": {
                    "entity": {
                        "id": fake_payment_id,
                        "entity": "payment",
                        "amount": amount_paise,
                        "currency": "INR",
                        "status": "captured",
                        "method": "upi",
                        "description": "Autonomous Smart Recovery Payment",
                        "notes": {"case_id": case_id or "—"},
                    }
                }
            },
            "created_at": int(datetime.now(timezone.utc).timestamp()),
        }

    raw_bytes = json.dumps(payload).encode("utf-8")
    valid_signature = RazorpayClient.generate_signature(raw_bytes)

    # Dispatch internally with valid signature
    class MockRequest:
        async def body(self):
            return raw_bytes

    res = await handle_razorpay_webhook(
        request=MockRequest(),
        x_razorpay_signature=valid_signature,
        session=session,
    )
    return {
        "success": True,
        "simulated_event": event_type,
        "signature_verified": True,
        "webhook_result": res,
    }
