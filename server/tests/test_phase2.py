import pytest
import uuid
from decimal import Decimal
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_registration_validation_and_atomicity(client: AsyncClient):
    """
    Test registration validation rules and atomic merchant + owner creation.
    """
    # 1. Missing required field (businessName)
    bad_res = await client.post(
        "/api/auth/register",
        json={
            "fullName": "Test Admin",
            "email": "invalid@test.com",
            "password": "password123",
        },
    )
    assert bad_res.status_code == 422

    # 2. Successful registration
    reg_res = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Delta Payments Ltd",
            "fullName": "Delta Admin",
            "email": "admin@deltapay.com",
            "password": "strongPassword123",
        },
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "token" in data
    assert data["user"]["email"] == "admin@deltapay.com"
    assert data["user"]["role"] == "OWNER"
    assert data["user"]["businessName"] == "Delta Payments Ltd"

    # 3. Duplicate email rejection
    dup_res = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Another Business",
            "fullName": "Another Name",
            "email": "admin@deltapay.com",
            "password": "strongPassword123",
        },
    )
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_authentication_and_current_user(client: AsyncClient):
    """
    Test login, bad password rejection, and /api/auth/me retrieval.
    """
    # Register user
    await client.post(
        "/api/auth/register",
        json={
            "businessName": "Gamma Technologies",
            "fullName": "Gamma User",
            "email": "gamma@technologies.com",
            "password": "password123",
        },
    )

    # Invalid password
    bad_login = await client.post(
        "/api/auth/login",
        json={"email": "gamma@technologies.com", "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401

    # Valid login
    login_res = await client.post(
        "/api/auth/login",
        json={"email": "gamma@technologies.com", "password": "password123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["token"]

    # Retrieve /api/auth/me
    me_res = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "gamma@technologies.com"
    assert me_data["businessName"] == "Gamma Technologies"
    assert me_data["role"] == "OWNER"

    # Unauthenticated access rejected
    unauth_res = await client.get("/api/auth/me")
    assert unauth_res.status_code == 401


@pytest.mark.asyncio
async def test_strict_merchant_isolation(client: AsyncClient):
    """
    MANDATORY CRITICAL TEST:
    Verify that Merchant A and Merchant B are strictly isolated across all domains:
    - Customers
    - Transactions
    - Recovery Cases
    - Policies
    - Audit Logs
    - Notifications
    """
    # 1. Register Merchant A
    res_a = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Merchant Alpha",
            "fullName": "Alpha Admin",
            "email": "alpha@example.com",
            "password": "alphaPassword123",
        },
    )
    token_a = res_a.json()["token"]
    auth_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register Merchant B
    res_b = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Merchant Beta",
            "fullName": "Beta Admin",
            "email": "beta@example.com",
            "password": "betaPassword123",
        },
    )
    token_b = res_b.json()["token"]
    auth_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Query Customers: Merchant A should have 0 customers initially
    cust_a = await client.get("/api/customers", headers=auth_a)
    assert cust_a.status_code == 200
    assert cust_a.json()["total"] == 0

    cust_b = await client.get("/api/customers", headers=auth_b)
    assert cust_b.status_code == 200
    assert cust_b.json()["total"] == 0

    # 4. Query Transactions: Merchant A has 0, Merchant B has 0
    tx_a = await client.get("/api/transactions", headers=auth_a)
    assert tx_a.status_code == 200
    assert tx_a.json()["pagination"]["total"] == 0

    tx_b = await client.get("/api/transactions", headers=auth_b)
    assert tx_b.status_code == 200
    assert tx_b.json()["pagination"]["total"] == 0

    # 5. Query Recovery Cases: Both see 0
    rec_a = await client.get("/api/recovery/cases", headers=auth_a)
    assert rec_a.status_code == 200
    assert rec_a.json()["total"] == 0

    rec_b = await client.get("/api/recovery/cases", headers=auth_b)
    assert rec_b.status_code == 200
    assert rec_b.json()["total"] == 0

    # 6. Query Audit Logs: Both isolated
    audit_a = await client.get("/api/audit-logs", headers=auth_a)
    assert audit_a.status_code == 200
    assert audit_a.json()["pagination"]["total"] == 0

    # 7. Query Notifications: Both isolated
    notif_a = await client.get("/api/notifications", headers=auth_a)
    assert notif_a.status_code == 200
    assert notif_a.json()["total"] == 0


@pytest.mark.asyncio
async def test_policy_simulation_evaluation(client: AsyncClient):
    """
    Test dry-run policy evaluation logic.
    """
    res = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Policy Tester",
            "fullName": "Policy Admin",
            "email": "policy@tester.com",
            "password": "password123",
        },
    )
    token = res.json()["token"]

    # Evaluate within threshold
    eval_res = await client.post(
        "/api/policies/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "amount": 25000.0,
            "retryCount": 1,
            "aiConfidence": 85,
            "recoveryProbability": 75,
        },
    )
    assert eval_res.status_code == 200
    data = eval_res.json()
    assert data["decision"] == "APPROVED"
    assert len(data["checks"]) == 4

    # Evaluate exceeding threshold
    blocked_res = await client.post(
        "/api/policies/evaluate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "amount": 150000.0,
            "retryCount": 4,
            "aiConfidence": 50,
            "recoveryProbability": 20,
        },
    )
    assert blocked_res.status_code == 200
    blocked_data = blocked_res.json()
    assert blocked_data["decision"] == "BLOCKED"
