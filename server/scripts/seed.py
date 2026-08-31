import asyncio
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta

from app.database.session import async_session_maker
from app.core.security import get_password_hash
from app.models.merchant import Merchant
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.transaction import Transaction, TransactionStatus
from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.policy import Policy
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.core.logging import logger


async def seed_database():
    """
    Seed development database with realistic fintech and recovery data,
    including the primary test merchant admin@acme.com / demo123.
    """
    async with async_session_maker() as session:
        logger.info("Checking if database is already seeded...")
        from sqlalchemy import select
        existing_user = await session.scalar(select(User).where(User.email == "admin@acme.com"))
        if existing_user:
            logger.info("Database already seeded with demo merchant. Skipping.")
            return

        logger.info("Seeding RevivePilot database...")

        # 1. Create Demo Merchant
        merchant_id = uuid.uuid4()
        merchant = Merchant(
            id=merchant_id,
            name="Acme Corporation",
            email="admin@acme.com",
            business_name="Acme Corporation",
            currency="INR",
            timezone="Asia/Kolkata",
            status="ACTIVE",
        )
        session.add(merchant)

        # 2. Create Owner User (admin@acme.com / demo123)
        owner_id = uuid.uuid4()
        owner = User(
            id=owner_id,
            merchant_id=merchant_id,
            name="Priya Mehta",
            email="admin@acme.com",
            password_hash=get_password_hash("demo123"),
            role=UserRole.OWNER.value,
            status="ACTIVE",
        )
        session.add(owner)

        # 3. Create Demo Customers
        customers_data = [
            ("cust_001", "Rahul Sharma", "rahul.s@example.com", "+91 98765 43210"),
            ("cust_002", "Ananya Iyer", "ananya.i@example.com", "+91 91234 56789"),
            ("cust_003", "Vikram Nair", "vikram.n@example.com", "+91 70123 45678"),
            ("cust_004", "Meera Pillai", "meera.p@example.com", "+91 80123 45670"),
            ("cust_005", "Arjun Kapoor", "arjun.k@example.com", "+91 99876 54321"),
        ]
        customer_map = {}
        for ext_id, name, email, phone in customers_data:
            c = Customer(
                id=uuid.uuid4(),
                merchant_id=merchant_id,
                name=name,
                email=email,
                phone=phone,
                external_customer_id=ext_id,
            )
            session.add(c)
            customer_map[ext_id] = c

        await session.flush()

        # 4. Create Transactions & Recovery Cases
        now = datetime.now(timezone.utc)

        # Txn 1: ₹25,000 Failed (Bank Timeout) -> Case: RECOVERED
        c1 = customer_map["cust_001"]
        t1 = Transaction(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            customer_id=c1.id,
            external_payment_id="pay_RC10291",
            amount=Decimal("25000.00"),
            currency="INR",
            status=TransactionStatus.SUCCESS.value,
            payment_method="CARD",
            failure_reason="BANK_TIMEOUT",
            created_at=now - timedelta(minutes=45),
        )
        session.add(t1)
        await session.flush()

        rc1 = RecoveryCase(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            transaction_id=t1.id,
            customer_id=c1.id,
            status=RecoveryStatus.RECOVERED.value,
            risk_score=91,
            recovery_probability=91,
            root_cause="BANK_TIMEOUT",
            recommended_strategy="Delayed Retry",
            expected_recovery_amount=Decimal("22750.00"),
            actual_recovered_amount=Decimal("25000.00"),
            attempt_count=1,
            max_attempts=3,
            resolved_at=now - timedelta(minutes=15),
            created_at=now - timedelta(minutes=45),
        )
        session.add(rc1)

        # Txn 2: ₹75,000 Failed (Card Declined) -> Case: EXECUTING
        c3 = customer_map["cust_003"]
        t2 = Transaction(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            customer_id=c3.id,
            external_payment_id="pay_RC10293",
            amount=Decimal("75000.00"),
            currency="INR",
            status=TransactionStatus.FAILED.value,
            payment_method="CARD",
            failure_reason="CARD_DECLINED",
            created_at=now - timedelta(hours=2),
        )
        session.add(t2)
        await session.flush()

        rc2 = RecoveryCase(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            transaction_id=t2.id,
            customer_id=c3.id,
            status=RecoveryStatus.EXECUTING.value,
            risk_score=85,
            recovery_probability=68,
            root_cause="CARD_DECLINED",
            recommended_strategy="Alt Payment Link",
            expected_recovery_amount=Decimal("51000.00"),
            actual_recovered_amount=Decimal("0.00"),
            attempt_count=1,
            max_attempts=3,
            created_at=now - timedelta(hours=2),
        )
        session.add(rc2)

        # Txn 3: ₹12,500 Failed (Insufficient Funds) -> Case: ANALYZING
        c4 = customer_map["cust_004"]
        t3 = Transaction(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            customer_id=c4.id,
            external_payment_id="pay_RC10294",
            amount=Decimal("12500.00"),
            currency="INR",
            status=TransactionStatus.FAILED.value,
            payment_method="NET_BANKING",
            failure_reason="INSUFFICIENT_FUNDS",
            created_at=now - timedelta(hours=5),
        )
        session.add(t3)
        await session.flush()

        rc3 = RecoveryCase(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            transaction_id=t3.id,
            customer_id=c4.id,
            status=RecoveryStatus.ANALYZING.value,
            risk_score=62,
            recovery_probability=75,
            root_cause="INSUFFICIENT_FUNDS",
            recommended_strategy="Delayed Retry",
            expected_recovery_amount=Decimal("9375.00"),
            actual_recovered_amount=Decimal("0.00"),
            attempt_count=0,
            max_attempts=3,
            created_at=now - timedelta(hours=5),
        )
        session.add(rc3)

        # 5. Seed Policies
        policies_data = [
            (
                "Default Retry Policy",
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
                    "notifyRoles": ["OWNER", "ADMIN"],
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
        for name, p_type, cfg in policies_data:
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

        # 6. Seed Audit Logs
        audit_events = [
            (
                "PAYMENT_FAILED",
                "Payment pay_RC10291 of ₹25,000 failed due to BANK_TIMEOUT",
                rc1.id,
                {"amount": 25000, "failure_code": "BANK_TIMEOUT"},
            ),
            (
                "RISK_DETECTED",
                "Revenue risk flagged at 91% probability of leakage",
                rc1.id,
                {"risk_score": 91},
            ),
            (
                "STRATEGY_SELECTED",
                "AI Strategy Agent selected 'Delayed Retry' with 91% recovery probability",
                rc1.id,
                {"strategy": "Delayed Retry"},
            ),
            (
                "POLICY_APPROVED",
                "Merchant retry policy validated: 1/3 attempts, amount within threshold",
                rc1.id,
                {"policy": "Default Retry Policy"},
            ),
            (
                "RECOVERY_SUCCESS",
                "Recovery retry processed successfully in Razorpay Sandbox. ₹25,000 recovered.",
                rc1.id,
                {"amount": 25000},
            ),
        ]
        for ev_type, desc, case_id, meta in audit_events:
            session.add(
                AuditLog(
                    id=uuid.uuid4(),
                    merchant_id=merchant_id,
                    user_id=owner_id,
                    recovery_case_id=case_id,
                    event_type=ev_type,
                    actor_type="AI_AGENT",
                    description=desc,
                    metadata_=meta,
                    created_at=now - timedelta(minutes=30),
                )
            )

        # 7. Seed Notifications
        session.add(
            Notification(
                id=uuid.uuid4(),
                merchant_id=merchant_id,
                user_id=owner_id,
                type="RECOVERY",
                title="Revenue Recovered: ₹25,000",
                message="Case RC-10291 recovered via automated Delayed Retry.",
                read=False,
                metadata_={"amount": 25000, "case_id": str(rc1.id)},
            )
        )

        await session.commit()
        logger.info("RevivePilot database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
