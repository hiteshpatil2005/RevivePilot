import time
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.transaction import Transaction
from app.models.agent_execution import AgentExecution
from app.models.recovery_conversation import RecoveryConversation
from app.agents.schemas import (
    AgentContext,
    AgentResult,
    MultiAgentAnalysisResponse,
    AgentActivity,
    FuturePlanStep,
)
from app.agents.detection_agent import DetectionAgent
from app.agents.root_cause_agent import RootCauseAgent
from app.agents.strategy_agent import StrategyAgent
from app.agents.action_agent import ActionAgent
from app.events.publisher import EventPublisher, EventType
from app.core.logging import logger
from app.core.config import settings


class AgentCoordinator:
    """
    Coordinates the autonomous multi-agent reasoning and replanning pipeline:
    Detection Agent -> Root Cause Agent -> Strategy Agent -> Policy & Action Agent.
    Strictly forbids hallucinating private bank balances or marking RECOVERED without verified payment.
    """

    def __init__(self):
        self.detection_agent = DetectionAgent()
        self.root_cause_agent = RootCauseAgent()
        self.strategy_agent = StrategyAgent()
        self.action_agent = ActionAgent()
        self.recent_activities: List[AgentActivity] = []

    def record_activity(
        self,
        agent_name: str,
        agent_type: str,
        action: str,
        detail: str,
        status: str = "success",
        case_id: Optional[str] = None,
    ):
        act = AgentActivity(
            id=f"act_{uuid.uuid4().hex[:10]}",
            agentName=agent_name,
            agentType=agent_type,
            caseId=case_id,
            action=action,
            detail=detail,
            status=status,
            timestamp=datetime.now(timezone.utc),
        )
        self.recent_activities.insert(0, act)
        if len(self.recent_activities) > 100:
            self.recent_activities.pop()

    async def analyze_case(
        self,
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
        auto_execute: bool = False,
        replan_trigger: Optional[str] = None,
    ) -> MultiAgentAnalysisResponse:
        """
        Executes the autonomous multi-agent reasoning pipeline on a recovery case.
        """
        start_pipeline = time.perf_counter()

        # 1. Fetch RecoveryCase with Customer & Transaction
        case = await session.get(RecoveryCase, case_id)
        if not case or case.merchant_id != merchant_id:
            raise ValueError("Recovery case not found or tenant mismatch")

        customer = await session.get(Customer, case.customer_id) if case.customer_id else None
        transaction = await session.get(Transaction, case.transaction_id) if case.transaction_id else None

        amount = transaction.amount if transaction else case.expected_recovery_amount
        failure_reason = case.root_cause or (transaction.failure_reason if transaction else "BANK_TIMEOUT")
        payment_method = transaction.payment_method if transaction else "CARD"

        tx_meta = {}
        if transaction and hasattr(transaction, "events") and transaction.events:
            for ev in transaction.events:
                if ev.metadata_:
                    tx_meta.update(ev.metadata_)

        cust_context_dict = case.customer_context or {}

        context = AgentContext(
            caseId=case.id,
            merchantId=case.merchant_id,
            transactionId=case.transaction_id,
            customerId=case.customer_id or uuid.uuid4(),
            amount=amount,
            currency="INR",
            failureReason=failure_reason,
            paymentMethod=payment_method,
            attemptCount=case.attempt_count,
            maxAttempts=case.max_attempts,
            customerName=customer.name if customer else None,
            customerEmail=customer.email if customer else None,
            customerLtv=getattr(customer, "lifetime_value", None) or Decimal("50000.00"),
            customerFailureHistory=1,
            customerContext=cust_context_dict,
            replanTrigger=replan_trigger,
            metadata=tx_meta,
        )

        # Transition case to INVESTIGATING
        case.status = RecoveryStatus.INVESTIGATING.value
        await session.flush()

        agent_traces: List[AgentResult] = []

        # ----------------------------------------------------
        # Step 1: Detection Agent (Risk & Urgency Qualification)
        # ----------------------------------------------------
        self.record_activity(
            agent_name="Detection Agent",
            agent_type="detection",
            action="INVESTIGATE_RISK",
            detail=f"Investigating risk and telemetry for case {str(case.id)[:8]}",
            case_id=str(case.id),
        )
        await EventPublisher.publish_event(
            event_type=EventType.AGENT_STARTED,
            merchant_id=merchant_id,
            case_id=case.id,
            data={"agent": "Detection Agent", "stage": "DETECTION"},
        )

        detection_res = await self.detection_agent.execute(context)
        agent_traces.append(detection_res)
        risk_score = detection_res.metadata.get("risk_score", 65)
        revenue_risk = detection_res.metadata.get("revenue_risk", "HIGH_RISK")
        case.risk_score = risk_score

        # ----------------------------------------------------
        # Step 2: Root Cause Diagnosis Agent (Factual Telemetry)
        # ----------------------------------------------------
        self.record_activity(
            agent_name="Root Cause Agent",
            agent_type="rootcause",
            action="DIAGNOSE_OPERATIONAL_CAUSE",
            detail=f"Diagnosing root cause '{failure_reason}' for case {str(case.id)[:8]}",
            case_id=str(case.id),
        )
        await EventPublisher.publish_event(
            event_type=EventType.AGENT_STARTED,
            merchant_id=merchant_id,
            case_id=case.id,
            data={"agent": "Root Cause Agent", "stage": "DIAGNOSIS"},
        )

        root_cause_res = await self.root_cause_agent.execute(context)
        agent_traces.append(root_cause_res)
        case.root_cause = failure_reason
        root_cause_category = root_cause_res.metadata.get("category", "CUSTOMER_LIQUIDITY")

        # ----------------------------------------------------
        # Step 3: Strategy & Recovery Decision Agent (Dynamic Plan)
        # ----------------------------------------------------
        self.record_activity(
            agent_name="Strategy Agent",
            agent_type="strategy",
            action="PLAN_DYNAMIC_STRATEGY",
            detail=f"Formulating dynamic multi-step recovery plan for case {str(case.id)[:8]}",
            case_id=str(case.id),
        )
        await EventPublisher.publish_event(
            event_type=EventType.AGENT_STARTED,
            merchant_id=merchant_id,
            case_id=case.id,
            data={"agent": "Strategy Agent", "stage": "STRATEGY"},
        )

        strategy_res = await self.strategy_agent.execute(context)
        agent_traces.append(strategy_res)

        recommended_strategy = strategy_res.recommended_strategy or "Dynamic Recovery"
        strat_meta = strategy_res.metadata
        current_state = strat_meta.get("current_state", "ON_HOLD")
        strat_reason = strat_meta.get("reason", "Formulated from telemetry and customer context")
        next_action = strat_meta.get("next_action", "HOLD")
        rec_prob = strategy_res.recovery_probability or 75
        prob_source = strat_meta.get("probability_source", "SIMULATION_BASELINE")
        merchant_approval_req = strat_meta.get("merchant_approval_required", False)
        smart_link_req = strat_meta.get("smart_link_required", False)
        future_plan_dicts = [f.model_dump() for f in strategy_res.future_plan] if strategy_res.future_plan else []

        erv = (amount * Decimal(str(rec_prob / 100.0))).quantize(Decimal("0.01"))

        # Update case fields with strategy plan
        case.current_strategy = recommended_strategy
        case.recommended_strategy = recommended_strategy
        case.strategy_reason = strat_reason
        case.strategy_confidence = strategy_res.confidence
        case.next_action = next_action
        case.recovery_probability = rec_prob
        case.expected_recovery_amount = erv
        case.merchant_approval_required = merchant_approval_req
        case.smart_link_required = smart_link_req
        case.future_plan = future_plan_dicts
        case.stop_conditions = strat_meta.get("stop_conditions", [])
        case.escalation_conditions = strat_meta.get("escalation_conditions", [])
        case.replan_conditions = strat_meta.get("replan_conditions", [])

        # ----------------------------------------------------
        # Step 4: Action & Policy Enforcement Agent
        # ----------------------------------------------------
        context.metadata["strategy"] = recommended_strategy
        context.metadata["next_action"] = next_action

        action_res = await self.action_agent.execute(context)
        agent_traces.append(action_res)

        policy_passed = action_res.policy_passed or False
        policy_checks = action_res.metadata.get("checks", [])
        executed_action_enum = action_res.action_enum or next_action

        # Determine target state based on strategy and policy
        if not policy_passed:
            case.status = RecoveryStatus.ESCALATED.value if "exceeds" in str(action_res.policy_violations) else RecoveryStatus.STOPPED.value
            case.next_action = "ESCALATE" if case.status == RecoveryStatus.ESCALATED.value else "STOP"
            case_action_desc = f"Action blocked by policy guardrails: {action_res.reasoning_summary}"
        else:
            if current_state == "WAITING_FOR_CUSTOMER":
                case.status = RecoveryStatus.WAITING_FOR_CUSTOMER.value
                case.next_action = "ASK_CUSTOMER"
                case_action_desc = "Initiated customer conversation to establish funds availability window."
            elif current_state == "ON_HOLD":
                case.status = RecoveryStatus.ON_HOLD.value
                case.next_action = "HOLD"
                case_action_desc = f"Case placed ON_HOLD: {strat_reason}"
            elif current_state == "INVESTIGATING":
                case.status = RecoveryStatus.INVESTIGATING.value
                case.next_action = "VERIFY_PAYMENT"
                case_action_desc = "Investigating payment state; verifying gateway authorization."
            elif case.merchant_approval_status == "REJECTED":
                case.status = RecoveryStatus.STOPPED.value
                case.next_action = "STOP"
                case_action_desc = "Strategy rejected by merchant. Automated recovery halted for manual merchant handling."
            elif merchant_approval_req and case.merchant_approval_status != "APPROVED":
                case.status = RecoveryStatus.READY_FOR_APPROVAL.value
                case.next_action = "REQUEST_MERCHANT_APPROVAL"
                case_action_desc = "Strategy planned. Awaiting merchant approval authorization before execution."
            else:
                case.status = RecoveryStatus.EXECUTING.value if auto_execute else RecoveryStatus.APPROVED.value
                case.next_action = executed_action_enum
                case_action_desc = f"Strategy approved for execution: {executed_action_enum}"

        case.last_agent_decision = executed_action_enum

        # Persist AgentExecution records for every agent in PostgreSQL
        for trace in agent_traces:
            agent_type = "detection" if "Detection" in trace.agent_name else (
                "rootcause" if "Root Cause" in trace.agent_name else (
                    "strategy" if "Strategy" in trace.agent_name else "learning"
                )
            )
            exec_record = AgentExecution(
                merchant_id=merchant_id,
                case_id=case.id,
                agent_name=trace.agent_name,
                agent_type=agent_type,
                decision=trace.decision,
                confidence=trace.confidence,
                latency_ms=trace.latency_ms,
                tokens_used=trace.tokens_used,
                model=trace.metadata.get("ai_model", settings.GEMINI_MODEL),
                input_summary=f"Context for case {str(case.id)[:8]} (amount: ₹{amount:,.2f}, reason: {failure_reason})",
                output_data=trace.metadata,
                status="SUCCESS",
            )
            session.add(exec_record)

            # Also write an AuditLog entry
            audit = AuditLog(
                merchant_id=merchant_id,
                recovery_case_id=case.id,
                event_type=f"AGENT_{trace.agent_name.upper().replace(' ', '_')}",
                actor_type="AI_AGENT",
                description=f"[{trace.agent_name}] {trace.reasoning_summary}",
                metadata_={
                    "agent": trace.agent_name,
                    "confidence": trace.confidence,
                    "decision": trace.decision,
                    "action_enum": getattr(trace, "action_enum", None),
                    "latency_ms": trace.latency_ms,
                    "tokens": trace.tokens_used,
                    "model": trace.metadata.get("ai_model", settings.GEMINI_MODEL),
                },
            )
            session.add(audit)

        await session.commit()
        await session.refresh(case)

        # Emit realtime events to Redis & WebSockets
        await EventPublisher.publish_event(
            event_type=EventType.RECOVERY_CASE_UPDATED,
            merchant_id=merchant_id,
            case_id=case.id,
            data={
                "status": case.status,
                "strategy": case.recommended_strategy,
                "current_strategy": case.current_strategy,
                "strategy_reason": case.strategy_reason,
                "next_action": case.next_action,
                "recoveryProbability": rec_prob,
                "policyPassed": policy_passed,
                "riskScore": case.risk_score,
                "revenue_risk": revenue_risk,
                "future_plan": future_plan_dicts,
                "merchant_approval_required": case.merchant_approval_required,
                "customer_context": case.customer_context,
            },
        )

        total_latency_ms = int((time.perf_counter() - start_pipeline) * 1000)

        self.record_activity(
            agent_name="Action Agent",
            agent_type="learning",
            action="PIPELINE_COMPLETE",
            detail=f"Case {str(case.id)[:8]} transitioned to {case.status} ({case.next_action})",
            status="success" if policy_passed else "warning",
            case_id=str(case.id),
        )

        return MultiAgentAnalysisResponse(
            caseId=case.id,
            status=case.status,
            riskScore=case.risk_score,
            revenueRisk=revenue_risk,
            recoveryProbability=rec_prob,
            probabilitySource=prob_source,
            expectedRecoveryAmount=erv,
            rootCause=case.root_cause,
            rootCauseCategory=root_cause_category,
            strategy=case.recommended_strategy,
            strategyReason=case.strategy_reason,
            nextAction=case.next_action,
            nextEvaluationAt=case.next_evaluation_at,
            customerContextRequired=case.status in [RecoveryStatus.WAITING_FOR_CUSTOMER.value, RecoveryStatus.ON_HOLD.value],
            merchantApprovalRequired=case.merchant_approval_required,
            smartLinkRequired=case.smart_link_required,
            futurePlan=strategy_res.future_plan,
            policyPassed=policy_passed,
            policyChecks=policy_checks,
            agentTraces=agent_traces,
            actionResult=case_action_desc,
            totalLatencyMs=total_latency_ms,
        )

    async def replan_case(
        self,
        session: AsyncSession,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
        trigger: str,
        customer_context_update: Optional[Dict[str, Any]] = None,
    ) -> MultiAgentAnalysisResponse:
        """
        Dynamic Replanning Loop:
        Triggered when new evidence arrives (customer response, merchant reject, bank recovery, repeat failure).
        Increments strategy_version and replan_count, updates plan, and persists new agent decisions.
        """
        case = await session.get(RecoveryCase, case_id)
        if not case or case.merchant_id != merchant_id:
            raise ValueError("Recovery case not found")

        case.replan_count += 1
        case.strategy_version += 1

        if customer_context_update:
            existing = dict(case.customer_context or {})
            existing.update(customer_context_update)
            case.customer_context = existing

            if "stated_retry_time" in customer_context_update or "expected_time" in customer_context_update:
                target_str = customer_context_update.get("stated_retry_time") or customer_context_update.get("expected_time")
                try:
                    # If ISO parseable, store datetime
                    case.customer_expected_retry_at = datetime.fromisoformat(target_str)
                    case.next_evaluation_at = case.customer_expected_retry_at
                except Exception:
                    case.next_evaluation_at = datetime.now(timezone.utc) + timedelta(hours=24)

        audit_replan = AuditLog(
            merchant_id=merchant_id,
            recovery_case_id=case.id,
            event_type="STRATEGY_REPLANNED",
            actor_type="AI_AGENT",
            description=f"Dynamic replanning triggered: {trigger}. Strategy incremented to v{case.strategy_version}.",
            metadata_={"trigger": trigger, "strategy_version": case.strategy_version},
        )
        session.add(audit_replan)
        await session.commit()

        # Run full analysis pipeline with replan trigger
        return await self.analyze_case(
            session=session,
            case_id=case_id,
            merchant_id=merchant_id,
            auto_execute=False,
            replan_trigger=trigger,
        )

    async def handle_customer_context(
        self,
        session: AsyncSession,
        case_id: uuid.UUID,
        customer_id: uuid.UUID,
        message: str,
        selected_option: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes interactive customer recovery conversation.
        Extracts expected funds availability or payment method preferences,
        records message in recovery_conversations, triggers dynamic replanning,
        and transitions case to ON_HOLD.
        """
        case = await session.get(RecoveryCase, case_id)
        if not case:
            raise ValueError("Recovery case not found")

        # 1. Record customer message
        customer_msg = RecoveryConversation(
            merchant_id=case.merchant_id,
            case_id=case.id,
            customer_id=customer_id,
            channel="CUSTOMER_PORTAL",
            sender_type="CUSTOMER",
            sender_name="Customer",
            message=message or selected_option or "Context provided",
            metadata_={"selected_option": selected_option},
        )
        session.add(customer_msg)

        # 2. Parse stated intent
        stated_time = selected_option or message
        context_update = {
            "stated_retry_time": stated_time,
            "confidence": "CUSTOMER_PROVIDED",
            "received_at": datetime.now(timezone.utc).isoformat(),
        }

        # 3. Create AI Agent acknowledgment message
        agent_reply_text = (
            f"Understood. I have recorded your expected availability as '{stated_time}'. "
            "RevivePilot cannot access your private bank account balance. "
            "The payment is placed on hold and will not be retried until you confirm readiness."
        )
        agent_msg = RecoveryConversation(
            merchant_id=case.merchant_id,
            case_id=case.id,
            customer_id=customer_id,
            channel="CUSTOMER_PORTAL",
            sender_type="AI_AGENT",
            sender_name="RevivePilot Agent",
            message=agent_reply_text,
            metadata_={"source": "CUSTOMER_CONTEXT_HANDLER"},
        )
        session.add(agent_msg)
        await session.commit()

        # 4. Trigger replan to move to ON_HOLD
        analysis_resp = await self.replan_case(
            session=session,
            case_id=case_id,
            merchant_id=case.merchant_id,
            trigger=f"CUSTOMER_CONTEXT_RECEIVED: {stated_time}",
            customer_context_update=context_update,
        )

        return {
            "reply": agent_reply_text,
            "case_status": analysis_resp.status,
            "strategy": analysis_resp.strategy,
            "next_action": analysis_resp.next_action,
        }

    async def coordinate_recovery(
        self,
        case_id: uuid.UUID,
        merchant_id: uuid.UUID,
        auto_execute: bool = False,
    ) -> Optional[MultiAgentAnalysisResponse]:
        """
        Entrypoint for autonomous background execution of the multi-agent mesh.
        """
        from app.database.session import async_session_maker
        async with async_session_maker() as session:
            try:
                return await self.analyze_case(
                    session=session,
                    case_id=case_id,
                    merchant_id=merchant_id,
                    auto_execute=auto_execute,
                )
            except Exception as e:
                logger.error(f"Error in coordinate_recovery for case {case_id}: {e}", exc_info=True)
                return None


coordinator = AgentCoordinator()
