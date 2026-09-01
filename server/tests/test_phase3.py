import pytest
import uuid
from decimal import Decimal
from httpx import AsyncClient

from app.payments.state_machine import PaymentStateMachine
from app.recovery.risk_engine import DeterministicRiskEngine


def test_payment_state_machine_transitions():
    """Verify transaction state machine allows legal paths and rejects illegal ones."""
    # Legal transitions
    assert PaymentStateMachine.can_transition("CREATED", "PENDING") is True
    assert PaymentStateMachine.can_transition("PENDING", "FAILED") is True
    assert PaymentStateMachine.can_transition("PENDING", "SUCCESS") is True
    assert PaymentStateMachine.can_transition("FAILED", "PENDING") is True  # on retry
    assert PaymentStateMachine.can_transition("SUCCESS", "REFUNDED") is True

    # Illegal transitions
    assert PaymentStateMachine.can_transition("SUCCESS", "FAILED") is False
    assert PaymentStateMachine.can_transition("CANCELLED", "SUCCESS") is False
    assert PaymentStateMachine.can_transition("REFUNDED", "SUCCESS") is False


def test_deterministic_risk_engine():
    """Verify risk engine rules, amounts, and Decimal recovery probability math."""
    # 1. Bank timeout
    res_timeout = DeterministicRiskEngine.evaluate(
        amount=Decimal("25000.00"),
        failure_reason="BANK_TIMEOUT",
    )
    assert res_timeout.risk_score == 75
    assert res_timeout.recovery_probability == 0.90
    assert res_timeout.expected_recovery_amount == Decimal("22500.00")
    assert res_timeout.recommended_strategy == "Delayed Retry"

    # 2. High-value transaction (> ₹1,00,000)
    res_high = DeterministicRiskEngine.evaluate(
        amount=Decimal("120000.00"),
        failure_reason="CARD_DECLINED",
    )
    assert res_high.risk_score >= 85
    assert res_high.recommended_strategy == "VIP Escalation"
    assert res_high.expected_recovery_amount == (Decimal("120000.00") * Decimal(str(res_high.recovery_probability)))


@pytest.mark.asyncio
async def test_payment_event_lifecycle_and_idempotency(client: AsyncClient):
    """
    Test creating payment events, idempotent deduplication, and state validation.
    """
    # 1. Register merchant
    reg_res = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Realtime Pay Ltd",
            "fullName": "Realtime Admin",
            "email": "realtime@pay.com",
            "password": "securePassword123",
        },
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a new failed payment event with an Idempotency-Key
    idem_key = f"idem_{uuid.uuid4().hex[:12]}"
    ev_res = await client.post(
        "/api/payments/events",
        headers={**headers, "Idempotency-Key": idem_key},
        json={
            "eventType": "PAYMENT_FAILED",
            "amount": 35000.0,
            "failureReason": "BANK_TIMEOUT",
            "paymentMethod": "CARD",
        },
    )
    assert ev_res.status_code == 201
    ev_data = ev_res.json()
    assert ev_data["eventType"] == "PAYMENT_FAILED"
    assert ev_data["newStatus"] == "FAILED"
    assert ev_data["failureReason"] == "BANK_TIMEOUT"
    event_id = ev_data["id"]
    txn_id = ev_data["transactionId"]

    # 3. Submit identical request with same idempotency key -> must return cached event
    dup_res = await client.post(
        "/api/payments/events",
        headers={**headers, "Idempotency-Key": idem_key},
        json={
            "eventType": "PAYMENT_FAILED",
            "amount": 35000.0,
            "failureReason": "BANK_TIMEOUT",
            "paymentMethod": "CARD",
        },
    )
    assert dup_res.status_code == 201
    assert dup_res.json()["id"] == event_id

    # 4. Verify Recovery Case was created automatically in PostgreSQL
    cases_res = await client.get("/api/recovery/cases", headers=headers)
    assert cases_res.status_code == 200
    cases_data = cases_res.json()
    assert cases_data["total"] >= 1
    created_case = cases_data["cases"][0]
    assert created_case["status"].upper() == "DETECTED"
    assert created_case["rootCause"] == "BANK_TIMEOUT"

    # 5. Prevent duplicate recovery case on subsequent failure on same transaction
    subsequent_res = await client.post(
        "/api/payments/events",
        headers=headers,
        json={
            "transactionId": txn_id,
            "eventType": "PAYMENT_FAILED",
            "failureReason": "BANK_TIMEOUT",
        },
    )
    assert subsequent_res.status_code == 201

    # Total cases for this merchant must still be 1 (updated, not duplicated)
    cases_res2 = await client.get("/api/recovery/cases", headers=headers)
    assert cases_res2.json()["total"] == 1


@pytest.mark.asyncio
async def test_illegal_state_transition_rejection(client: AsyncClient):
    """
    Verify that an illegal status change (e.g. SUCCESS -> FAILED) is rejected with 400.
    """
    # Register merchant
    reg = await client.post(
        "/api/auth/register",
        json={
            "businessName": "State Test Co",
            "fullName": "State Admin",
            "email": "state@test.com",
            "password": "password123",
        },
    )
    token = reg.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create SUCCESS payment
    succ_res = await client.post(
        "/api/payments/events",
        headers=headers,
        json={
            "eventType": "PAYMENT_SUCCESS",
            "amount": 10000.0,
        },
    )
    assert succ_res.status_code == 201
    txn_id = succ_res.json()["transactionId"]

    # Attempt illegal transition: SUCCESS -> FAILED
    bad_transition = await client.post(
        "/api/payments/events",
        headers=headers,
        json={
            "transactionId": txn_id,
            "eventType": "PAYMENT_FAILED",
            "failureReason": "BANK_TIMEOUT",
        },
    )
    assert bad_transition.status_code == 400
    assert "illegal payment transition" in bad_transition.json()["detail"].lower()


@pytest.mark.asyncio
async def test_simulator_controls_and_merchant_isolation(client: AsyncClient):
    """
    Test simulator start/stop/status endpoints and ensure Merchant A cannot see Merchant B's payment events.
    """
    # 1. Register Merchant A
    reg_a = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Merchant One",
            "fullName": "Admin One",
            "email": "one@merchant.com",
            "password": "password123",
        },
    )
    token_a = reg_a.json()["token"]
    auth_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register Merchant B
    reg_b = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Merchant Two",
            "fullName": "Admin Two",
            "email": "two@merchant.com",
            "password": "password123",
        },
    )
    token_b = reg_b.json()["token"]
    auth_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Check simulator status
    status_res = await client.get("/api/payments/simulator/status", headers=auth_a)
    assert status_res.status_code == 200
    assert status_res.json()["running"] is False

    # 4. Trigger single simulated event for Merchant A
    single_res = await client.post(
        "/api/payments/simulator/event",
        headers=auth_a,
        json={"scenario": "FAILURE_SPIKE"},
    )
    assert single_res.status_code == 200

    # 5. Verify Merchant A has 1 payment event
    events_a = await client.get("/api/payments/events", headers=auth_a)
    assert events_a.status_code == 200
    assert events_a.json()["total"] == 1

    # 6. CRITICAL MERCHANT ISOLATION: Merchant B must have 0 payment events!
    events_b = await client.get("/api/payments/events", headers=auth_b)
    assert events_b.status_code == 200
    assert events_b.json()["total"] == 0

    # 7. Start and Stop simulator for Merchant A
    start_res = await client.post(
        "/api/payments/simulator/start",
        headers=auth_a,
        json={"scenario": "BANK_TIMEOUT", "eventsPerMinute": 12},
    )
    assert start_res.status_code == 200
    assert start_res.json()["running"] is True
    assert start_res.json()["scenario"] == "BANK_TIMEOUT"

    stop_res = await client.post("/api/payments/simulator/stop", headers=auth_a)
    assert stop_res.status_code == 200
    assert stop_res.json()["running"] is False
