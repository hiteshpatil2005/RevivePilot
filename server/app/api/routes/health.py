from fastapi import APIRouter
from app.schemas.common import HealthCheckResponse
from app.database.connection import check_database_connection
from app.events.publisher import check_redis_connection

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthCheckResponse)
async def health_check():
    """
    Consolidated health check verifying API, PostgreSQL, and Redis status.
    """
    db_ok = await check_database_connection()
    redis_ok = await check_redis_connection()

    all_ok = db_ok and redis_ok
    status_str = "healthy" if all_ok else "degraded"

    return HealthCheckResponse(
        status=status_str,
        service="revivepilot-api",
        version="1.0.0",
        services={
            "api": "up",
            "database": "up" if db_ok else "down",
            "redis": "up" if redis_ok else "down",
        },
    )


@router.get("/database")
async def database_health():
    """Check PostgreSQL database connectivity."""
    db_ok = await check_database_connection()
    return {"database": "up" if db_ok else "down"}


@router.get("/redis")
async def redis_health():
    """Check Redis connectivity."""
    redis_ok = await check_redis_connection()
    return {"redis": "up" if redis_ok else "down"}
