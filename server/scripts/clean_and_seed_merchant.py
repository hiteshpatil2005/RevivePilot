import asyncio
import uuid
from decimal import Decimal
from sqlalchemy import select, delete
from app.database.session import async_session_maker
from app.core.security import get_password_hash
from app.models.merchant import Merchant
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase
from app.models.policy import Policy
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.core.logging import logger

MERCHANT_EMAIL = "hiteshpatil0205@gmail.com"
MERCHANT_NAME = "Hitesh Patil"
BUSINESS_NAME = "RevivePilot Revenue Recovery"
MERCHANT_PASSWORD = "Hitesh@12345"


async def clean_and_seed():
    """
    Purges all dummy merchants, demo users, fake transactions, fake recovery cases,
    and initializes the sole merchant and owner account for hiteshpatil0205@gmail.com.
    """
    logger.info("Connecting to database to purge dummy data...")
    async with async_session_maker() as session:
        # 1. Delete all existing merchants (cascades to users, customers, txns, cases, logs, policies)
        existing_merchants = (await session.scalars(select(Merchant))).all()
        for m in existing_merchants:
            logger.info(f"Removing old merchant organization: {m.email} ({m.name})")
            await session.delete(m)
        await session.commit()

        # Extra safety check on orphan records if cascade didn't catch external items
        await session.execute(delete(AuditLog))
        await session.execute(delete(Notification))
        await session.execute(delete(RecoveryCase))
        await session.execute(delete(Transaction))
        await session.execute(delete(Customer))
        await session.execute(delete(User))
        await session.commit()

        logger.info("All dummy data successfully purged.")

        # 2. Create the primary Merchant
        merchant_id = uuid.uuid4()
        merchant = Merchant(
            id=merchant_id,
            name=MERCHANT_NAME,
            email=MERCHANT_EMAIL,
            business_name=BUSINESS_NAME,
            currency="INR",
            timezone="Asia/Kolkata",
            status="ACTIVE",
        )
        session.add(merchant)

        # 3. Create the primary Owner User
        owner = User(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            name=MERCHANT_NAME,
            email=MERCHANT_EMAIL,
            password_hash=get_password_hash(MERCHANT_PASSWORD),
            role=UserRole.OWNER.value,
            status="ACTIVE",
        )
        session.add(owner)

        # 4. Standard operational recovery policies for the merchant engine
        operational_policies = [
            (
                "Default Auto-Retry Policy",
                "retry_policy",
                {
                    "maxRetryAttempts": 3,
                    "cooldownMinutes": 30,
                    "maxRetryAmountINR": 50000,
                    "allowAutoRetry": True,
                },
            ),
            (
                "High Value Amount Limit",
                "amount_limit",
                {
                    "thresholdINR": 50000,
                    "action": "require_approval",
                    "notifyRoles": ["OWNER"],
                },
            ),
            (
                "Fraud Risk Stopping Rule",
                "stopping_rule",
                {
                    "condition": "risk_score > 90",
                    "action": "halt_immediately",
                },
            ),
            (
                "VIP Escalation Rule",
                "escalation_rule",
                {
                    "customerLTVThresholdINR": 100000,
                    "escalateAfterFailedAttempts": 2,
                },
            ),
        ]
        for name, p_type, cfg in operational_policies:
            session.add(
                Policy(
                    id=uuid.uuid4(),
                    merchant_id=merchant_id,
                    name=name,
                    type=p_type,
                    enabled=True,
                    configuration=cfg,
                )
            )

        await session.commit()
        logger.info(
            f"Successfully provisioned merchant {MERCHANT_EMAIL} and owner account with zero dummy data."
        )


if __name__ == "__main__":
    asyncio.run(clean_and_seed())
