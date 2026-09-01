import json
import uuid
import pytest
from decimal import Decimal
from httpx import AsyncClient

from app.core.config import settings
from app.payments.razorpay_client import RazorpayClient
from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.audit_log import AuditLog
from sqlalchemy import select


@pytest.mark.asyncio
async def test_razorpay_hmac_signature_verification():
    """Test cryptographic HMAC-SHA256 signature verification."""
    payload_bytes = b'{"event": "payment.failed", "id": "pay_test123"}'
    valid_sig = RazorpayClient.generate_signature(payload_bytes)

    # 1. Valid signature passes
    assert RazorpayClient.verify_webhook_signature(payload_bytes, valid_sig) is True

    # 2. Tampered signature fails
    tampered_sig = valid_sig[:-4] + "ffff"
    assert RazorpayClient.verify_webhook_signature(payload_bytes, tampered_sig) is False

    # 3. Tampered payload fails
    tampered_bytes = b'{"event": "payment.failed", "id": "pay_tampered"}'
    assert RazorpayClient.verify_webhook_signature(tampered_bytes, valid_sig) is False


@pytest.mark.asyncio
async def test_unauthorized_webhook_rejection(client: AsyncClient):
    """Test that forged or unsigned webhook requests are rejected with 401."""
    # 1. Missing signature header
    res_no_sig = await client.post(
        "/api/webhooks/razorpay",
        content=b'{"event": "payment.failed"}',
        headers={"Content-Type": "application/json"},
    )
    assert res_no_sig.status_code == 401
    assert "signature" in res_no_sig.json()["detail"].lower()

    # 2. Invalid signature header
    res_bad_sig = await client.post(
        "/api/webhooks/razorpay",
        content=b'{"event": "payment.failed"}',
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": "invalid_hmac_hex_string",
        },
    )
    assert res_bad_sig.status_code == 401


@pytest.mark.asyncio
async def test_razorpay_payment_failed_webhook_ingestion(client: AsyncClient):
    """
    Test real webhook ingestion for payment.failed creating transaction and recovery case.
    """
    # 1. Register merchant
    reg_res = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Razorpay Partner Corp",
            "fullName": "Priya Merchant",
            "email": "priya@partner.com",
            "password": "securePassword123",
        },
    )
    assert reg_res.status_code == 201

    # 2. Construct valid signed webhook payload
    pay_id = f"pay_{uuid.uuid4().hex[:12]}"
    webhook_data = {
        "entity": "event",
        "account_id": "acc_demo_merchant",
        "event": "payment.failed",
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": pay_id,
                    "entity": "payment",
                    "amount": 4800000,  # 48,000 INR
                    "currency": "INR",
                    "status": "failed",
                    "method": "card",
                    "description": "Enterprise Subscription",
                    "error_code": "BAD_REQUEST_ERROR",
                    "error_description": "Transaction timed out at issuing bank",
                    "error_reason": "bank_timeout",
                }
            }
        },
        "created_at": 1756700000,
    }
    raw_body = json.dumps(webhook_data).encode("utf-8")
    sig = RazorpayClient.generate_signature(raw_body)

    # 3. Post webhook to /api/webhooks/razorpay
    res = await client.post(
        "/api/webhooks/razorpay",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sig,
        },
    )
    assert res.status_code == 200
    res_json = res.json()
    assert res_json["status"] == "processed"
    assert res_json["event"] == "payment.failed"
    assert res_json["recovery_initiated"] is True
    assert res_json["failure_reason"] == "BANK_TIMEOUT"


@pytest.mark.asyncio
async def test_razorpay_smart_payment_link_and_captured_webhook(client: AsyncClient):
    """
    Test full round-trip recovery:
    Failed payment -> Recovery Case -> Generate Smart Link -> Captured Webhook -> Case RECOVERED.
    """
    # 1. Register merchant
    reg_res = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Fintech Solutions Ltd",
            "fullName": "Fintech Admin",
            "email": "fintech@solutions.com",
            "password": "securePassword123",
        },
    )
    token = reg_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Ingest failed payment via webhook
    case_pay_id = f"pay_{uuid.uuid4().hex[:12]}"
    fail_payload = {
        "entity": "event",
        "account_id": "acc_demo",
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": case_pay_id,
                    "amount": 3200000,  # 32,000 INR
                    "currency": "INR",
                    "status": "failed",
                    "method": "card",
                    "error_description": "Card limit exceeded or declined",
                    "error_reason": "card_declined",
                }
            }
        },
    }
    raw_fail = json.dumps(fail_payload).encode("utf-8")
    fail_sig = RazorpayClient.generate_signature(raw_fail)

    await client.post(
        "/api/webhooks/razorpay",
        content=raw_fail,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": fail_sig},
    )

    # 3. Retrieve created case
    cases_res = await client.get("/api/recovery/cases", headers=headers)
    cases = cases_res.json()["cases"]
    assert len(cases) >= 1
    case_id = cases[0]["id"]

    # 4. Generate Razorpay Smart Alternative Payment Link
    link_res = await client.post(
        f"/api/recovery/cases/{case_id}/payment-link",
        headers=headers,
    )
    assert link_res.status_code == 200
    link_data = link_res.json()
    assert link_data["success"] is True
    assert "rzp.io" in link_data["payment_link"]

    # 5. Ingest payment.captured webhook referencing this case
    captured_pay_id = f"pay_cap_{uuid.uuid4().hex[:10]}"
    cap_payload = {
        "entity": "event",
        "account_id": "acc_demo",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": captured_pay_id,
                    "amount": 3200000,
                    "currency": "INR",
                    "status": "captured",
                    "method": "upi",
                    "notes": {"case_id": case_id},
                }
            }
        },
    }
    raw_cap = json.dumps(cap_payload).encode("utf-8")
    cap_sig = RazorpayClient.generate_signature(raw_cap)

    cap_res = await client.post(
        "/api/webhooks/razorpay",
        content=raw_cap,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": cap_sig},
    )
    assert cap_res.status_code == 200
    assert cap_res.json()["recovered"] is True

    # 6. Verify case status is now RECOVERED in database
    verify_res = await client.get(f"/api/recovery/cases/{case_id}", headers=headers)
    assert verify_res.status_code == 200
    case_obj = verify_res.json()
    assert case_obj["status"].upper() == "RECOVERED"
    assert float(case_obj["actualRecoveredAmount"]) == 32000.0


@pytest.mark.asyncio
async def test_razorpay_webhook_simulation_endpoint(client: AsyncClient):
    """Test the developer webhook simulation endpoint."""
    sim_res = await client.post(
        "/api/webhooks/razorpay/simulate",
        params={
            "event_type": "payment.failed",
            "amount": 18500.0,
            "failure_reason": "BANK_TIMEOUT",
        },
    )
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["success"] is True
    assert sim_data["signature_verified"] is True
    assert sim_data["webhook_result"]["status"] == "processed"
