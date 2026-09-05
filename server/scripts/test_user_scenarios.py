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
from app.websocket.socketio_server import emit_to_customer, emit_to_merchant
from app.core.logging import logger
from sqlalchemy import select, delete


async def run_customer_scenarios():
    print("=" * 85)
    print("TESTING ALL 28 TAXONOMY SCENARIOS FOR LOGGED-IN CUSTOMER: hiteshdpatil2005@gmail.com")
    print("=" * 85)

    async with async_session_maker() as session:
        merchant = (await session.scalars(select(Merchant))).first()
        if not merchant:
            print("ERROR: No merchant found!")
            return

        customer = (await session.scalars(select(Customer).where(Customer.email == "hiteshdpatil2005@gmail.com"))).first()
        if not customer:
            customer = Customer(
                id=uuid.UUID("47a4ac2f-a94e-4fe6-9fc6-5b93c5a44710"),
                merchant_id=merchant.id,
                name="Hitesh Dattatraya Patil",
                email="hiteshdpatil2005@gmail.com",
                phone="+919876543210",
                balance=Decimal("150000.00"),
                upi_vpa="hitesh@oksbi",
                card_number="411111******1111",
                card_network="VISA",
            )
            session.add(customer)
            await session.commit()
            await session.refresh(customer)
            print(f"Created Customer: {customer.name} ({customer.email})")

        print(f"Customer: {customer.name} ({customer.email}) | ID: {customer.id}")
        print(f"Merchant: {merchant.name} ({merchant.email}) | ID: {merchant.id}")

        # 2. Clean previous cases for this customer to ensure clean scenario ledger
        print("\nCleaning previous test cases for this customer...")
        old_cases = (await session.scalars(select(RecoveryCase).where(RecoveryCase.customer_id == customer.id))).all()
        for oc in old_cases:
            await session.execute(delete(AgentExecution).where(AgentExecution.case_id == oc.id))
            await session.execute(delete(AuditLog).where(AuditLog.recovery_case_id == oc.id))
            await session.delete(oc)
        await session.execute(delete(Transaction).where(Transaction.customer_id == customer.id))
        await session.commit()
        print("Previous customer test cases purged.")

        total_scenarios = len(FAILURE_TAXONOMY)
        print(f"\nExecuting all {total_scenarios} failure scenarios through the 4-Agent Mesh...")
        print("-" * 85)

        verified_scenarios = []

        for idx, (reason_key, profile) in enumerate(FAILURE_TAXONOMY.items(), 1):
            # Select appropriate payment method
            method = "CARD"
            if "UPI" in reason_key or "VPA" in reason_key:
                method = "UPI"
            elif "MANDATE" in reason_key or "RECURRING" in reason_key:
                method = "UPI_AUTOPAY"
            elif "NET_BANKING" in profile.get("alternate_method", ""):
                method = "NET_BANKING"

            # Assign realistic scenario amounts
            amount = Decimal(str(random.randint(4500, 38000)))
            if reason_key == "LIMIT_EXCEEDED":
                amount = Decimal("120000.00")  # Trigger VIP escalation / high value rule
            elif reason_key == "RISK_FRAUD_DECLINE":
                amount = Decimal("85000.00")   # High risk fraud stoppage

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
                attempt_count=1,
                max_attempts=3,
                created_at=datetime.now(timezone.utc),
            )
            session.add(initial_case)
            await session.commit()

            # Execute the 4-Agent Mesh via Coordinator
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
                prob = analysis.recovery_probability

                # Realtime Socket.IO emission to customer and merchant
                await emit_to_customer(str(customer.id), "payment.failed", {
                    "case_id": str(case_id),
                    "amount": float(amount),
                    "reason": reason_key,
                    "strategy": strat,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

                await emit_to_merchant(str(merchant.id), "recovery.case.created", {
                    "case_id": str(case_id),
                    "customer_name": customer.name,
                    "customer_email": customer.email,
                    "amount": float(amount),
                    "status": state_val,
                    "strategy": strat,
                    "recovery_probability": prob,
                    "next_action": next_act,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

                print(f"[{idx:02d}/{total_scenarios}] {reason_key:28} | Amt: ₹{amount:>10,.2f} | Strat: '{strat}' | State: {state_val} | Prob: {prob}% | Next: {next_act}")

                verified_scenarios.append({
                    "scenario": reason_key,
                    "name": profile.get("name"),
                    "amount": float(amount),
                    "strategy": strat,
                    "state": state_val,
                    "probability": prob,
                    "next_action": next_act,
                    "case_id": str(case_id),
                })

            except Exception as e:
                print(f"[{idx:02d}/{total_scenarios}] ERROR in scenario {reason_key}: {e}")

        # Verification checks on agent performance in database
        agent_executions = (await session.scalars(
            select(AgentExecution).join(RecoveryCase).where(RecoveryCase.customer_id == customer.id)
        )).all()

        audit_logs = (await session.scalars(
            select(AuditLog).join(RecoveryCase).where(RecoveryCase.customer_id == customer.id)
        )).all()

        user_cases = (await session.scalars(
            select(RecoveryCase).where(RecoveryCase.customer_id == customer.id)
        )).all()

        user_txns = (await session.scalars(
            select(Transaction).where(Transaction.customer_id == customer.id)
        )).all()

        print("\n" + "=" * 85)
        print("AGENT PERFORMANCE & DATABASE VERIFICATION SUMMARY")
        print("=" * 85)
        print(f"Customer Account                : {customer.name} ({customer.email})")
        print(f"Total Transactions Created      : {len(user_txns)}")
        print(f"Total Recovery Cases Created    : {len(user_cases)}")
        print(f"Total Agent Executions Logged   : {len(agent_executions)}")
        print(f"Total Audit Trail Entries Logged: {len(audit_logs)}")

        # Breakdown by Agent Type
        agent_types = {}
        for ae in agent_executions:
            agent_types[ae.agent_type] = agent_types.get(ae.agent_type, 0) + 1

        print("\nAgent Executions Breakdown:")
        for atype, count in sorted(agent_types.items()):
            print(f"  • {atype:20}: {count} executions")

        # Distinct strategies formulated
        distinct_strategies = set(vs["strategy"] for vs in verified_scenarios)
        distinct_actions = set(vs["next_action"] for vs in verified_scenarios)
        print(f"\nDistinct Autonomous Strategies Formulated : {len(distinct_strategies)}")
        print(f"Distinct Next Actions Executed           : {len(distinct_actions)}")
        print("=" * 85)

if __name__ == "__main__":
    asyncio.run(run_customer_scenarios())
