from fastapi import APIRouter
from app.api.routes import (
    health,
    auth,
    merchants,
    dashboard,
    transactions,
    recovery,
    policies,
    analytics,
    audit,
)

api_router = APIRouter(prefix="/api")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(merchants.router)
api_router.include_router(dashboard.router)
api_router.include_router(transactions.router)
api_router.include_router(recovery.router)
api_router.include_router(policies.router)
api_router.include_router(analytics.router)
api_router.include_router(audit.router)
