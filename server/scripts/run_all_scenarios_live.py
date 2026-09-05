import asyncio
import uuid
import random
from decimal import Decimal
from datetime import datetime, timezone

from app.database.session import async_session_maker
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.transaction import Transaction, TransactionStatus
from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.agent_execution import AgentExecution
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.payments.failure_taxonomy import FAILURE_TAXONOMY, generate_razorpay_error_payload
from app.agents.coordinator import coordinator
from app.websocket.socketio_server import emit_to_merchant
from app.core.logging import logger
from sqlalchemy import select, delete


async def run_all_scenarios():
    print("=" * 80)
    print("RUNNING ALL 28 FAILURE SCENARIOS THROUGH LIVE DATABASE & MULTI-AGENT MESH")
    print("=" * 80)

    async with async_session_maker() as session:
        # 1. Fetch the primary merchant
        merchant = (await session.scalars(select(Merchant))).first()
        if not merchant:
            print("ERROR: No merchant found! Please run seed.py first.")
            return

        print(f"Merchant: {merchant.name} ({merchant.email}) | ID: {merchant.id}")

        # 2. Clean out previous runs to ensure a pristine 28-case test ledger
        print("Cleaning previous test transactions and recovery cases...")
        await session.execute(delete(AgentExecution))
        await session.execute(delete(AuditLog))
        await session.execute(delete(Notification))
        await session.execute(delete(RecoveryCase))
        await session.execute(delete(Transaction))
        await session.commit()

        # 3. Create active customers if none exist
        customers = (await session.scalars(select(Customer).where(Customer.merchant_id == merchant.id))).all()
        if not customers:
            demo_customers = [
                Customer(
                    id=uuid.uuid4(),
                    merchant_id=merchant.id,
                    name="Aarav Sharma",
                    email="aarav.sharma@example.com",
                    phone="+919876543210",
                    balance=Decimal("15000.00"),
                ),
                Customer(
                    id=uuid.uuid4(),
                    merchant_id=merchant.id,
                    name="Priya Patel",
                    email="priya.patel@example.com",
                    phone="+919876543211",
                    balance=Decimal("8500.00"),
                ),
                Customer(
                    id=uuid.uuid4(),
                    merchant_id=merchant.id,
                    name="Rohan Verma",
                    email="rohan.verma@example.com",
                    phone="+919876543212",
                    balance=Decimal("25000.00"),
                ),
            ]
            session.add_all(demo_customers)
            await session.commit()
            customers = demo_customers

        print(f"Active test customers available: {len(customers)}")

        total_scenarios = len(FAILURE_TAXONOMY)
        print(f"Processing all {total_scenarios} failure taxonomy scenarios through multi-agent mesh...\n")

        case_summaries = []

        for idx, (reason_key, profile) in enumerate(FAILURE_TAXONOMY.items(), 1):
            customer = random.choice(customers)

            # Determine payment method
            method = "CARD"
            if "UPI" in reason_key or "VPA" in reason_key:
                method = "UPI"
            elif "MANDATE" in reason_key or "RECURRING" in reason_key:
                method = "UPI_AUTOPAY"
            elif "NET_BANKING" in profile.get("alternate_method", ""):
                method = "NET_BANKING"

            # Assign realistic scenario amounts
            amount = Decimal(str(random.randint(2500, 48000)))
            if reason_key == "LIMIT_EXCEEDED":
                amount = Decimal("120000.00")
            elif reason_key == "RISK_FRAUD_DECLINE":
                amount = Decimal("85000.00")

            tx_id = uuid.uuid4()
            pay_id = f"pay_{uuid.uuid4().hex[:10]}"
            err_payload = generate_razorpay_error_payload(reason_key, pay_id)

            transaction = Transaction(
                id=tx_id,
                merchant_id=merchant.id,
                customer_id=customer.id,
                external_payment_id=pay_id,
                external_order_id=f"order_{uuid.uuid4().hex[:10]} ({profile['name']})",
                amount=amount,
                currency="INR",
                status=TransactionStatus.FAILED.value,
                payment_method=method,
                failure_reason=reason_key,
                error_code=profile.get("code", "GATEWAY_ERROR"),
                error_description=profile.get("description", "Payment failed"),
                raw_payload=err_payload,
                created_at=datetime.now(timezone.utc),
            )
            session.add(transaction)
            await session.flush()

            case_id = uuid.uuid4()
            initial_case = RecoveryCase(
                id=case_id,
                merchant_id=merchant.id,
                transaction_id=transaction.id,
                customer_id=customer.id,
                status=RecoveryStatus.DETECTED.value,
                risk_score=profile.get("base_risk", 75),
                recovery_probability=int(profile.get("base_prob", 0.75) * 100),
                root_cause=reason_key,
                recommended_strategy=profile.get("strategy", "Dynamic Recovery Strategy"),
                expected_recovery_amount=(amount * Decimal(str(profile.get("base_prob", 0.75)))).quantize(Decimal("0.01")),
                actual_recovered_amount=Decimal("0.00"),
                attempt_count=0,
                max_attempts=3,
                created_at=datetime.now(timezone.utc),
            )
            session.add(initial_case)
            await session.commit()

            # Execute the 4-Agent Mesh via Coordinator
            print(f"[{idx:02d}/{total_scenarios}] Scenario: {reason_key:28} | Amt: ₹{amount:>10,.2f}")
            try:
                analysis = await coordinator.analyze_case(
                    session=session,
                    case_id=case_id,
                    merchant_id=merchant.id,
                    auto_execute=True,
                )
                strat = analysis.strategy or profile.get("strategy")
                next_act = analysis.next_action
                state_val = analysis.status
                print(f"     -> Strategy: '{strat}' | State: {state_val} | Next: {next_act}")
                case_summaries.append({
                    "scenario": reason_key,
                    "name": profile.get("name"),
                    "amount": float(amount),
                    "strategy": strat,
                    "state": state_val,
                    "next_action": next_act,
                    "case_id": str(case_id),
                })
            except Exception as e:
                print(f"     -> Error in agent analysis: {e}")

        # Summary Metrics
        rc_count = (await session.scalars(select(RecoveryCase))).all()
        ae_count = (await session.scalars(select(AgentExecution))).all()
        al_count = (await session.scalars(select(AuditLog))).all()

        print("\n" + "=" * 80)
        print("ALL SCENARIOS VERIFICATION & PERSISTENCE COMPLETE")
        print("=" * 80)
        print(f"Total Live Transactions Created : {len(case_summaries)}")
        print(f"Total Recovery Cases in DB      : {len(rc_count)}")
        print(f"Total Agent Executions Logged   : {len(ae_count)}")
        print(f"Total Audit Trail Entries       : {len(al_count)}")
        print("=" * 80)

        # Notify active merchant sessions on WebSockets
        await emit_to_merchant(str(merchant.id), "recovery.batch_updated", {
            "cases_count": len(rc_count),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

if __name__ == "__main__":
    asyncio.run(run_all_scenarios())
