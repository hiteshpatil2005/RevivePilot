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


async def seed_database(force: bool = False):
    """
    Seed development database with comprehensive fintech data matching Phase 2 specifications.
    Includes 1 merchant, 3 users, 12 customers, 26 transactions, 8 recovery cases,
    4 policies, 26 audit logs, and 6 notifications.
    """
    async with async_session_maker() as session:
        from sqlalchemy import select
        existing_merchant = await session.scalar(select(Merchant).where(Merchant.email == "admin@acme.com"))
        existing_demo_user = await session.scalar(select(User).where(User.email == "demo@revivepilot.ai"))
        if existing_merchant and not existing_demo_user:
            demo_user = User(
                id=uuid.uuid4(),
                merchant_id=existing_merchant.id,
                name="Demo Admin",
                email="demo@revivepilot.ai",
                password_hash=get_password_hash("demo123"),
                role=UserRole.OWNER.value,
                status="ACTIVE",
            )
            session.add(demo_user)
            await session.commit()
            logger.info("Added demo@revivepilot.ai user account to existing merchant.")

        existing_user = await session.scalar(select(User).where(User.email == "admin@acme.com"))
        if (existing_merchant or existing_user) and not force:
            logger.info("Database already seeded with demo merchant (admin@acme.com). Skipping.")
            return

        if existing_merchant and force:
            logger.info("Force flag set. Removing existing demo merchant data before re-seeding...")
            await session.delete(existing_merchant)
            await session.commit()

        logger.info("Seeding comprehensive RevivePilot Phase 2 database...")

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

        # 2. Create 3 Users (Owner, Admin, Analyst)
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
        admin_user = User(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            name="Rahul Varma",
            email="rahul.admin@acme.com",
            password_hash=get_password_hash("demo123"),
            role=UserRole.ADMIN.value,
            status="ACTIVE",
        )
        analyst_user = User(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            name="Sneha Patel",
            email="sneha.analyst@acme.com",
            password_hash=get_password_hash("demo123"),
            role=UserRole.ANALYST.value,
            status="ACTIVE",
        )
        demo_user = User(
            id=uuid.uuid4(),
            merchant_id=merchant_id,
            name="Demo Admin",
            email="demo@revivepilot.ai",
            password_hash=get_password_hash("demo123"),
            role=UserRole.OWNER.value,
            status="ACTIVE",
        )
        session.add_all([owner, admin_user, analyst_user, demo_user])

        # 3. Create 12 Customers
        customers_data = [
            ("cust_001", "Rahul Sharma", "rahul.s@example.com", "+91 98765 43210"),
            ("cust_002", "Ananya Iyer", "ananya.i@example.com", "+91 91234 56789"),
            ("cust_003", "Vikram Nair", "vikram.n@example.com", "+91 70123 45678"),
            ("cust_004", "Meera Pillai", "meera.p@example.com", "+91 80123 45670"),
            ("cust_005", "Arjun Kapoor", "arjun.k@example.com", "+91 99876 54321"),
            ("cust_006", "Rohan Sen", "rohan.s@example.com", "+91 98111 22334"),
            ("cust_007", "Pooja Joshi", "pooja.j@example.com", "+91 98222 33445"),
            ("cust_008", "Siddharth Roy", "siddharth.r@example.com", "+91 98333 44556"),
            ("cust_009", "Kavita Reddy", "kavita.r@example.com", "+91 98444 55667"),
            ("cust_010", "Aditya Verma", "aditya.v@example.com", "+91 98555 66778"),
            ("cust_011", "Neha Gupta", "neha.g@example.com", "+91 98666 77889"),
            ("cust_012", "Divya Menon", "divya.m@example.com", "+91 98777 88990"),
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

        now = datetime.now(timezone.utc)

        from app.payments.failure_taxonomy import FAILURE_TAXONOMY

        # 4. Create Transactions & Recovery Cases covering all 25 Failure Causes + Normal Transactions
        # Standard historical successful/pending transactions
        base_txns = [
            ("cust_009", "pay_TXN1009", Decimal("15000.00"), TransactionStatus.SUCCESS.value, "UPI", None, 2),
            ("cust_010", "pay_TXN1010", Decimal("32000.00"), TransactionStatus.SUCCESS.value, "CARD", None, 4),
            ("cust_011", "pay_TXN1011", Decimal("4500.00"), TransactionStatus.SUCCESS.value, "WALLET", None, 6),
            ("cust_012", "pay_TXN1012", Decimal("68000.00"), TransactionStatus.SUCCESS.value, "NET_BANKING", None, 9),
            ("cust_001", "pay_TXN1013", Decimal("8900.00"), TransactionStatus.SUCCESS.value, "UPI", None, 12),
            ("cust_002", "pay_TXN1014", Decimal("54000.00"), TransactionStatus.SUCCESS.value, "CARD", None, 15),
            ("cust_003", "pay_TXN1015", Decimal("19500.00"), TransactionStatus.SUCCESS.value, "UPI", None, 17),
            ("cust_009", "pay_TXN1021", Decimal("9500.00"), TransactionStatus.PENDING.value, "UPI", None, 1),
            ("cust_010", "pay_TXN1022", Decimal("22000.00"), TransactionStatus.PENDING.value, "CARD", None, 2),
            ("cust_011", "pay_TXN1023", Decimal("50000.00"), TransactionStatus.PENDING.value, "NET_BANKING", None, 4),
            ("cust_012", "pay_TXN1024", Decimal("16500.00"), TransactionStatus.PENDING.value, "WALLET", None, 7),
            ("cust_002", "pay_TXN1026", Decimal("89000.00"), TransactionStatus.SUCCESS.value, "CARD", None, 38),
        ]

        # 25 transactions mapping directly to the 25 Failure Taxonomy items
        method_cycle = ["CARD", "UPI", "NET_BANKING", "WALLET"]
        cust_keys = list(customer_map.keys())
        failure_txns = []
        failure_cases = []

        status_pool = [
            RecoveryStatus.DETECTED.value,
            RecoveryStatus.ANALYZING.value,
            RecoveryStatus.APPROVED.value,
            RecoveryStatus.EXECUTING.value,
            RecoveryStatus.RECOVERED.value,
            RecoveryStatus.FAILED.value,
            RecoveryStatus.ESCALATED.value,
            RecoveryStatus.STOPPED.value,
        ]

        for i, (cause_key, profile) in enumerate(FAILURE_TAXONOMY.items(), start=1):
            c_key = cust_keys[(i - 1) % len(cust_keys)]
            pay_id = f"pay_RC{10290 + i}"
            amt = Decimal(str(1500 + (i * 2450)))
            method = method_cycle[(i - 1) % len(method_cycle)]
            h_ago = max(1, 48 - (i * 1.8))

            failure_txns.append(
                (c_key, pay_id, amt, TransactionStatus.FAILED.value, method, cause_key, h_ago)
            )

            # Assign realistic recovery case status and amounts
            c_status = status_pool[(i - 1) % len(status_pool)]
            exp_rec = (amt * Decimal(str(profile["base_prob"]))).quantize(Decimal("0.01"))
            act_rec = amt if c_status == RecoveryStatus.RECOVERED.value else Decimal("0.00")
            attempts = 1 if c_status in [RecoveryStatus.EXECUTING.value, RecoveryStatus.RECOVERED.value] else (3 if c_status == RecoveryStatus.FAILED.value else 0)

            failure_cases.append(
                (pay_id, c_status, profile["base_risk"], int(profile["base_prob"] * 100), cause_key, profile["strategy"], exp_rec, act_rec, attempts, 3)
            )

        txns_specs = failure_txns + base_txns
        cases_specs = failure_cases

        txn_map = {}
        for cust_key, pay_id, amount, status, method, reason, h_ago in txns_specs:
            c = customer_map[cust_key]
            t = Transaction(
                id=uuid.uuid4(),
                merchant_id=merchant_id,
                customer_id=c.id,
                external_payment_id=pay_id,
                amount=amount,
                currency="INR",
                status=status,
                payment_method=method,
                failure_reason=reason,
                created_at=now - timedelta(hours=h_ago),
            )
            session.add(t)
            txn_map[pay_id] = (t, c)

        await session.flush()

        case_map = {}
        for pay_id, c_status, risk, prob, cause, strategy, exp_amt, act_amt, attempts, max_att in cases_specs:
            t, c = txn_map[pay_id]
            rc = RecoveryCase(
                id=uuid.uuid4(),
                merchant_id=merchant_id,
                transaction_id=t.id,
                customer_id=c.id,
                status=c_status,
                risk_score=risk,
                recovery_probability=prob,
                root_cause=cause,
                recommended_strategy=strategy,
                expected_recovery_amount=exp_amt,
                actual_recovered_amount=act_amt,
                attempt_count=attempts,
                max_attempts=max_att,
                resolved_at=now - timedelta(minutes=15) if c_status == RecoveryStatus.RECOVERED.value else None,
                created_at=t.created_at,
            )
            session.add(rc)
            case_map[pay_id] = rc

        await session.flush()

        # 5. Seed 4 Policies
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

        # 6. Seed 26 Audit Logs
        rc1 = case_map["pay_RC10291"]
        rc2 = case_map["pay_RC10292"]
        rc3 = case_map["pay_RC10293"]
        rc6 = case_map["pay_RC10296"]
        rc8 = case_map["pay_RC10298"]

        audit_events = [
            ("PAYMENT_FAILED", "Payment pay_RC10291 of ₹25,000 failed due to BANK_TIMEOUT", rc1.id, {"amount": 25000, "failure_code": "BANK_TIMEOUT"}),
            ("RISK_DETECTED", "Revenue risk flagged at 91% probability of leakage", rc1.id, {"risk_score": 91}),
            ("STRATEGY_SELECTED", "AI Strategy Agent selected 'Delayed Retry' with 91% recovery probability", rc1.id, {"strategy": "Delayed Retry"}),
            ("POLICY_APPROVED", "Merchant retry policy validated: 1/3 attempts, amount within threshold", rc1.id, {"policy": "Default Retry Policy"}),
            ("RECOVERY_SUCCESS", "Recovery retry processed successfully in Razorpay Sandbox. ₹25,000 recovered.", rc1.id, {"amount": 25000}),
            
            ("PAYMENT_FAILED", "Payment pay_RC10292 of ₹120,000 failed due to CARD_DECLINED", rc2.id, {"amount": 120000}),
            ("RISK_DETECTED", "High fraud risk score (95) detected on transaction pay_RC10292", rc2.id, {"risk_score": 95}),
            ("POLICY_BLOCKED", "Case halted immediately by Fraud Risk Stopping Rule (risk_score > 90)", rc2.id, {"rule": "Fraud Risk Stopping Rule"}),
            
            ("PAYMENT_FAILED", "Payment pay_RC10293 of ₹75,000 failed due to CARD_DECLINED", rc3.id, {"amount": 75000}),
            ("RISK_DETECTED", "Revenue risk flagged at 85% with alternative recovery path", rc3.id, {"risk_score": 85}),
            ("STRATEGY_SELECTED", "Strategy Agent proposed Alternative Payment Link (WhatsApp/SMS)", rc3.id, {"channel": "WhatsApp"}),
            ("RECOVERY_STARTED", "Alternative payment link dispatched to customer Vikram Nair", rc3.id, {"phone": "+91 70123 45678"}),
            
            ("PAYMENT_FAILED", "Payment pay_RC10296 of ₹48,000 failed due to NETWORK_ERROR", rc6.id, {"amount": 48000}),
            ("STRATEGY_SELECTED", "AI proposed delayed payment link retry", rc6.id, {"strategy": "Alternative Payment Link"}),
            ("POLICY_APPROVED", "Approved within threshold limit of ₹50,000", rc6.id, {"limit": 50000}),
            
            ("PAYMENT_FAILED", "Payment pay_RC10298 of ₹92,000 failed due to CARD_DECLINED", rc8.id, {"amount": 92000}),
            ("POLICY_BLOCKED", "Exceeds auto-retry limit of ₹50,000. Moved to VIP Review.", rc8.id, {"limit": 50000}),
            ("CASE_ESCALATED", "Case escalated to Priority Operations queue for human contact", rc8.id, {"assigned_role": "ADMIN"}),
            
            ("USER_LOGIN", "Owner Priya Mehta logged in from 103.21.244.1", None, {"email": "admin@acme.com"}),
            ("POLICY_UPDATED", "Default Retry Policy updated cooldown to 30 minutes", None, {"updated_by": "admin@acme.com"}),
            ("WEBHOOK_RECEIVED", "Razorpay webhook payment.failed received for pay_RC10295", None, {"event": "payment.failed"}),
            ("DASHBOARD_VIEWED", "Daily revenue analytics viewed by Priya Mehta", None, {}),
            ("CUSTOMER_UPDATED", "Updated contact phone for customer Ananya Iyer", None, {"customer_id": "cust_002"}),
            ("PAYMENT_FAILED", "Payment pay_TXN1016 of ₹14,200 failed due to BANK_TIMEOUT", None, {"amount": 14200}),
            ("PAYMENT_FAILED", "Payment pay_TXN1017 of ₹27,500 failed due to NETWORK_ERROR", None, {"amount": 27500}),
            ("PAYMENT_FAILED", "Payment pay_TXN1019 of ₹83,000 failed due to CARD_DECLINED", None, {"amount": 83000}),
        ]

        for i, (ev_type, desc, case_id, meta) in enumerate(audit_events):
            session.add(
                AuditLog(
                    id=uuid.uuid4(),
                    merchant_id=merchant_id,
                    user_id=owner_id,
                    recovery_case_id=case_id,
                    event_type=ev_type,
                    actor_type="AI_AGENT" if "AGENT" in desc or "AI" in desc else "SYSTEM",
                    description=desc,
                    metadata_=meta,
                    created_at=now - timedelta(hours=len(audit_events) - i),
                )
            )

        # 7. Seed 6 Notifications
        notifs_data = [
            ("RECOVERY", "Revenue Recovered: ₹25,000", "Case RC-10291 recovered via automated Delayed Retry.", False, {"amount": 25000, "case_id": str(rc1.id)}),
            ("POLICY", "Approval Required: Case RC-10298", "Transaction of ₹92,000 exceeds standard limit. Human review requested.", False, {"amount": 92000, "case_id": str(rc8.id)}),
            ("ALERT", "High Risk Transaction Halted", "Payment of ₹120,000 blocked by Fraud Stopping Rule (Risk Score 95).", False, {"case_id": str(rc2.id)}),
            ("AGENT", "Strategy Executed: RC-10293", "Alternative payment link sent via WhatsApp to Vikram Nair.", True, {"case_id": str(rc3.id)}),
            ("SYSTEM", "Daily Recovery Summary", "1 case recovered today. ₹25,000 revenue saved from leakage.", True, {"recovered": 25000}),
            ("SYSTEM", "System Health Normal", "PostgreSQL database and Redis event bus running normally.", True, {}),
        ]

        for n_type, title, msg, is_read, meta in notifs_data:
            session.add(
                Notification(
                    id=uuid.uuid4(),
                    merchant_id=merchant_id,
                    user_id=owner_id,
                    type=n_type,
                    title=title,
                    message=msg,
                    read=is_read,
                    metadata_=meta,
                    created_at=now - timedelta(minutes=15),
                )
            )

        await session.commit()
        logger.info("RevivePilot Phase 2 database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database(force=True))
