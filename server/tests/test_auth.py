import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient):
    """
    Test full authentication lifecycle:
    1. Register new merchant & owner
    2. Verify JWT token and user profile
    3. Login with credentials
    4. Call protected /api/auth/me
    """
    # 1. Register
    reg_payload = {
        "businessName": "Fintech Test Corp",
        "fullName": "Test Admin",
        "email": "admin@fintechtest.com",
        "password": "securepassword123",
    }
    reg_res = await client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "token" in reg_data
    assert reg_data["user"]["email"] == "admin@fintechtest.com"
    token = reg_data["token"]

    # 2. Access /api/auth/me with Token
    me_res = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "admin@fintechtest.com"
    assert me_data["role"] == "OWNER"

    # 3. Login with credentials
    login_payload = {
        "email": "admin@fintechtest.com",
        "password": "securepassword123",
    }
    login_res = await client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "token" in login_data
    assert login_data["user"]["email"] == "admin@fintechtest.com"

    # 4. Incorrect password rejected
    bad_login = await client.post(
        "/api/auth/login",
        json={"email": "admin@fintechtest.com", "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401


@pytest.mark.asyncio
async def test_merchant_isolation(client: AsyncClient):
    """
    Test that authenticated endpoints (like dashboard metrics)
    enforce isolation between different registered merchants.
    """
    # Merchant A
    res_a = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Merchant A Corp",
            "fullName": "User A",
            "email": "user.a@merchant.com",
            "password": "password123",
        },
    )
    token_a = res_a.json()["token"]

    # Merchant B
    res_b = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Merchant B Corp",
            "fullName": "User B",
            "email": "user.b@merchant.com",
            "password": "password123",
        },
    )
    token_b = res_b.json()["token"]

    # Request dashboard metrics as Merchant A
    dash_a = await client.get(
        "/api/dashboard/metrics",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert dash_a.status_code == 200
    data_a = dash_a.json()
    assert "revenueAtRisk" in data_a

    # Request dashboard metrics as Merchant B
    dash_b = await client.get(
        "/api/dashboard/metrics",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert dash_b.status_code == 200
    data_b = dash_b.json()
    assert "revenueAtRisk" in data_b

    # Unauthenticated request rejected
    unauth = await client.get("/api/dashboard/metrics")
    assert unauth.status_code == 401
