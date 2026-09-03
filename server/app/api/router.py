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
    customers,
    notifications,
    payments,
    agents,
    webhooks,
    customer_portal,
)

api_router = APIRouter(prefix="/api")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(merchants.router)
api_router.include_router(customers.router)
api_router.include_router(dashboard.router)
api_router.include_router(transactions.router)
api_router.include_router(payments.router)
api_router.include_router(recovery.router)
api_router.include_router(policies.router)
api_router.include_router(analytics.router)
api_router.include_router(audit.router)
api_router.include_router(notifications.router)
api_router.include_router(agents.router)
api_router.include_router(webhooks.router)
api_router.include_router(customer_portal.router)
