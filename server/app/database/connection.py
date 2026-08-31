from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from app.core.config import settings
from app.core.logging import logger

# Ensure the database URL uses postgresql+asyncpg
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Async connection engine with connection pool
engine: AsyncEngine = create_async_engine(
    db_url,
    echo=settings.DEBUG and settings.APP_ENV == "development",
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
)


async def check_database_connection() -> bool:
    """Perform a lightweight query to verify the database connection."""
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning(f"Database health check failed: {exc}")
        return False
