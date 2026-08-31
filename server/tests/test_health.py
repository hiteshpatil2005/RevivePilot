import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test root landing endpoint returns 200 and online status."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "RevivePilot"
    assert data["status"] == "online"


@pytest.mark.asyncio
async def test_health_check_endpoint(client: AsyncClient):
    """Test health check returns status structure."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "revivepilot-api"
    assert "status" in data
    assert "services" in data
    assert data["services"]["api"] == "up"
