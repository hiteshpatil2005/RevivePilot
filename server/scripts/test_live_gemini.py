import asyncio
import uuid
from decimal import Decimal
from sqlalchemy import select

from app.database.session import async_session_maker
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.audit_log import AuditLog
from app.agents.coordinator import coordinator


async def run_live_verification():
    async with async_session_maker() as session:
        # Get merchant
        res = await session.execute(select(Merchant).limit(1))
        merchant = res.scalar_one_or_none()
        assert merchant, "Merchant not found"

        # Get or create customer
        res_cust = await session.execute(select(Customer).where(Customer.merchant_id == merchant.id).limit(1))
        customer = res_cust.scalar_one_or_none()
        if not customer:
            customer = Customer(
                merchant_id=merchant.id,
                email="test_gemini@example.com",
                name="Gemini Test Customer",
                balance=Decimal("45000.00"),
            )
            session.add(customer)
            await session.flush()

        # Create failed transaction
        tx = Transaction(
            merchant_id=merchant.id,
            customer_id=customer.id,
            external_payment_id=f"pay_gemini_{uuid.uuid4().hex[:8]}",
            amount=Decimal("8500.00"),
            currency="INR",
            status="FAILED",
            payment_method="UPI",
            failure_reason="INVALID_UPI_ID",
        )
        session.add(tx)
        await session.flush()

        # Create recovery case
        case = RecoveryCase(
            merchant_id=merchant.id,
            customer_id=customer.id,
            transaction_id=tx.id,
            status=RecoveryStatus.DETECTED.value,
            root_cause="INVALID_UPI_ID",
            expected_recovery_amount=Decimal("8500.00"),
        )
        session.add(case)
        await session.commit()
        await session.refresh(case)

        print(f"Case created: {case.id}, analyzing with Gemini...")
        analysis = await coordinator.analyze_case(
            session=session,
            case_id=case.id,
            merchant_id=merchant.id,
            auto_execute=True,
        )

        print("=== Multi-Agent Pipeline Completed ===")
        print(f"Case Status: {analysis.status}")
        print(f"Root Cause: {analysis.root_cause}")
        print(f"Strategy: {analysis.strategy}")
        print(f"Recovery Prob: {analysis.recovery_probability}%")
        print(f"Policy Passed: {analysis.policy_passed}")
        print(f"Traces count: {len(analysis.agent_traces)}")
        for t in analysis.agent_traces:
            model = t.metadata.get("ai_model", "unknown")
            print(f" - [{t.agent_name}] Decision: {t.decision} | Conf: {t.confidence}% | Latency: {t.latency_ms}ms | Model: {model}")
            print(f"   Reasoning: {t.reasoning_summary[:130]}...")

        # Check audit log
        res_audit = await session.execute(select(AuditLog).where(AuditLog.recovery_case_id == case.id))
        logs = res_audit.scalars().all()
        print(f"Audit logs created: {len(logs)}")
        for l in logs:
            print(f" - {l.event_type}: Model={l.metadata_.get('model')}")


if __name__ == "__main__":
    asyncio.run(run_live_verification())
