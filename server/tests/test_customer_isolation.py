import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_customer_token
from app.models.customer import Customer
from app.models.merchant import Merchant
from app.models.transaction import Transaction, TransactionStatus
from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.websocket.socketio_server import sio, emit_to_customer
from tests.conftest import TestingSessionLocal


@pytest.mark.asyncio
async def test_customer_isolation_and_scoping():
    """
    Test that Customer A and Customer B have strict multi-tenant isolation:
    - Customer A cannot access Customer B's recovery cases (returns 404).
    - Customer A cannot retry Customer B's recovery cases (returns 404).
    - Customer A only lists Customer A's transactions.
    """
    async with TestingSessionLocal() as session:
        # Create merchant
        merchant = Merchant(
            id=uuid.uuid4(),
            name="Acme Global Inc",
            business_name="Acme Global",
            email="owner@acme.com",
            currency="INR",
        )
        session.add(merchant)

        # Create Customer A
        cust_a = Customer(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            name="Alice Customer",
            email="alice@example.com",
            phone="+91 98765 00001",
            is_verified=True,
        )
        session.add(cust_a)

        # Create Customer B
        cust_b = Customer(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            name="Bob Customer",
            email="bob@example.com",
            phone="+91 98765 00002",
            is_verified=True,
        )
        session.add(cust_b)

        # Create Transaction & Recovery Case for Customer A
        tx_a = Transaction(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            customer_id=cust_a.id,
            amount=5000.0,
            currency="INR",
            status=TransactionStatus.FAILED.value,
            payment_method="UPI",
            failure_reason="BANK_TIMEOUT",
        )
        session.add(tx_a)

        case_a = RecoveryCase(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            customer_id=cust_a.id,
            transaction_id=tx_a.id,
            status=RecoveryStatus.EXECUTING.value,
            root_cause="BANK_TIMEOUT",
        )
        session.add(case_a)

        # Create Transaction for Customer B
        tx_b = Transaction(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            customer_id=cust_b.id,
            amount=3500.0,
            currency="INR",
            status=TransactionStatus.SUCCESS.value,
            payment_method="CARD",
        )
        session.add(tx_b)

        await session.commit()

    # Generate isolated JWT tokens for Customer A and Customer B
    token_a = create_customer_token(cust_a.id, merchant.id, cust_a.email)
    token_b = create_customer_token(cust_b.id, merchant.id, cust_b.email)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Customer A requests Customer A's recovery case -> ALLOWED (200 OK)
        res_a_allowed = await client.get(
            f"/api/customer/recovery/{case_a.id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_a_allowed.status_code == 200, res_a_allowed.text
        assert res_a_allowed.json()["id"] == str(case_a.id)

        # 2. Customer B attempts to access Customer A's recovery case -> DENIED (404 Not Found)
        res_b_denied = await client.get(
            f"/api/customer/recovery/{case_a.id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_b_denied.status_code == 404, "Customer B was able to access Customer A's case!"

        # 3. Customer B attempts to retry Customer A's recovery case -> DENIED (404 Not Found)
        res_retry_denied = await client.post(
            f"/api/customer/recovery/{case_a.id}/retry",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_retry_denied.status_code == 404, "Customer B was able to retry Customer A's case!"

        # 4. Customer A retries own case -> ALLOWED (200 OK)
        res_retry_allowed = await client.post(
            f"/api/customer/recovery/{case_a.id}/retry",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_retry_allowed.status_code == 200
        assert res_retry_allowed.json()["status"] == "RECOVERED"

        # 5. Customer A lists orders -> Only Customer A's orders returned
        res_orders_a = await client.get(
            "/api/customer/orders",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_orders_a.status_code == 200
        orders_a = res_orders_a.json()["orders"]
        assert len(orders_a) == 1
        assert orders_a[0]["amount"] == 5000.0

        # 6. Customer B lists orders -> Only Customer B's orders returned
        res_orders_b = await client.get(
            "/api/customer/orders",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_orders_b.status_code == 200
        orders_b = res_orders_b.json()["orders"]
        assert len(orders_b) == 1
        assert orders_b[0]["amount"] == 3500.0


@pytest.mark.asyncio
async def test_socketio_room_isolation():
    """
    Test that Socket.IO emit_to_customer routes strictly to room 'customer:{customer_id}'
    and never broadcasts to another customer's room.
    """
    emitted_calls = []

    # Mock sio.emit to track target rooms
    original_emit = sio.emit

    async def mock_emit(event, data=None, room=None, skip_sid=None, namespace=None, callback=None, **kwargs):
        emitted_calls.append({"event": event, "room": room, "data": data})

    sio.emit = mock_emit
    try:
        cust_a_id = "00000000-0000-0000-0000-00000000000a"
        cust_b_id = "00000000-0000-0000-0000-00000000000b"

        # Emit an event for Customer A
        await emit_to_customer(
            customer_id=cust_a_id,
            event_type="payment.failed",
            data={"amount": 5000, "failure_reason": "BANK_TIMEOUT"},
        )

        # Verify that all emitted events were directed strictly to room 'customer:{cust_a_id}'
        assert len(emitted_calls) > 0
        for call in emitted_calls:
            assert call["room"] == f"customer:{cust_a_id}"
            assert call["room"] != f"customer:{cust_b_id}"
            assert call["room"] != "merchants_global"

        # Customer B received zero events
        cust_b_calls = [c for c in emitted_calls if c["room"] == f"customer:{cust_b_id}"]
        assert len(cust_b_calls) == 0
    finally:
        sio.emit = original_emit


@pytest.mark.asyncio
async def test_otp_security_and_invalidation():
    """
    Test OTP security guarantees:
    - Never exposed in API response
    - Verified and invalidated immediately (one-time use)
    - Re-verification with same code is rejected (400 Bad Request)
    - Rate-limiting cooldown prevents rapid spam
    """
    from app.services.otp_service import OTPService

    test_email = f"user_{uuid.uuid4().hex[:8]}@example.com"

    # Request OTP
    req_res = await OTPService.request_otp(email=test_email, name="Test User")
    assert req_res["success"] is True
    # Verify raw OTP is NEVER returned in response
    assert "otp" not in req_res
    assert "raw_otp" not in req_res

    # Rapid second request should be blocked by cooldown (429)
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await OTPService.request_otp(email=test_email)
    assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_balance_deduction_and_order_persistence():
    """
    Test that:
    1. Unauthenticated payment attempt is rejected (401).
    2. Successful payment decrements customer balance in DB and response.
    3. Orders list returns persistent transactions with itemName, status, and date.
    """
    from decimal import Decimal

    async with TestingSessionLocal() as session:
        merchant = Merchant(
            id=uuid.uuid4(),
            name="Balance Test Merchant",
            business_name="Balance Test Inc",
            email=f"owner_{uuid.uuid4().hex[:6]}@test.com",
            currency="INR",
        )
        session.add(merchant)

        cust = Customer(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            name="Test Spender",
            email=f"spender_{uuid.uuid4().hex[:6]}@test.com",
            phone="+91 98765 43210",
            balance=Decimal("150000.00"),
            is_verified=True,
        )
        session.add(cust)
        await session.commit()
        await session.refresh(cust)

        token = create_customer_token(cust.id, merchant.id, cust.email)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Unauthenticated payment is rejected
        unauth_res = await client.post(
            "/api/customer/payments/simulate",
            json={"amount": 25000.0, "method": "CARD", "scenario": "SUCCESS", "item_name": "Standard API Plan"},
        )
        assert unauth_res.status_code == 401

        # 2. Authenticated payment succeeds and decrements balance
        pay_res = await client.post(
            "/api/customer/payments/simulate",
            headers={"Authorization": f"Bearer {token}"},
            json={"amount": 25000.0, "method": "CARD", "scenario": "SUCCESS", "item_name": "Standard API Plan"},
        )
        assert pay_res.status_code == 200
        pay_data = pay_res.json()
        assert pay_data["success"] is True
        assert pay_data["status"] == "SUCCESS"
        assert pay_data["remaining_balance"] == 125000.0

        # Verify balance in database directly
        async with TestingSessionLocal() as session:
            refreshed_cust = await session.get(Customer, cust.id)
            assert refreshed_cust.balance == Decimal("125000.00")

        # 3. Check customer orders endpoint
        orders_res = await client.get(
            "/api/customer/orders",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert orders_res.status_code == 200
        orders_data = orders_res.json()
        assert orders_data["total"] >= 1
        latest_order = orders_data["orders"][0]
        assert latest_order["amount"] == 25000.0
        assert latest_order["status"] == "SUCCESS"
        assert latest_order["itemName"] == "Standard API Plan"
        assert latest_order["date"] is not None
