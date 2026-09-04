import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.recovery_case import RecoveryCase, RecoveryStatus
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.transaction import Transaction
from app.agents.schemas import AgentContext, AgentResult, MultiAgentAnalysisResponse, AgentActivity
from app.agents.detection_agent import DetectionAgent
from app.agents.root_cause_agent import RootCauseAgent
from app.agents.strategy_agent import StrategyAgent
from app.agents.action_agent import ActionAgent
from app.events.publisher import EventPublisher, EventType
from app.core.logging import logger
from app.core.config import settings


class AgentCoordinator:
    """
    Coordinates the multi-agent execution pipeline:
    Detection Agent -> Root Cause Agent -> Strategy Agent -> Action & Policy Agent
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
            metadata={},
        )

        # Transition case to ANALYZING
        case.status = RecoveryStatus.ANALYZING.value
        await session.flush()

        agent_traces: List[AgentResult] = []

        # ----------------------------------------------------
        # Step 1: Detection Agent
        # ----------------------------------------------------
        self.record_activity(
            agent_name="Detection Agent",
            agent_type="detection",
            action="ANALYZE_RISK",
            detail=f"Analyzing risk profile for case {str(case.id)[:8]}",
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
        case.risk_score = risk_score

        # ----------------------------------------------------
        # Step 2: Root Cause Diagnosis Agent
        # ----------------------------------------------------
        self.record_activity(
            agent_name="Root Cause Agent",
            agent_type="rootcause",
            action="DIAGNOSE_FAILURE",
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

        # ----------------------------------------------------
        # Step 3: Strategy & Decision Agent
        # ----------------------------------------------------
        self.record_activity(
            agent_name="Strategy Agent",
            agent_type="strategy",
            action="SELECT_STRATEGY",
            detail=f"Formulating recovery strategy for case {str(case.id)[:8]}",
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
        recommended_strategy = strategy_res.recommended_strategy or "Delayed Retry"
        recovery_prob = strategy_res.recovery_probability or 70

        case.recommended_strategy = recommended_strategy
        case.recovery_probability = int(recovery_prob)
        case.expected_recovery_amount = (amount * Decimal(str(recovery_prob / 100.0))).quantize(Decimal("0.01"))

        # ----------------------------------------------------
        # Step 4: Action & Policy Enforcement Agent
        # ----------------------------------------------------
        context.metadata["strategy"] = recommended_strategy
        action_res = await self.action_agent.execute(context)
        agent_traces.append(action_res)

        policy_passed = action_res.policy_passed or False
        policy_checks = action_res.metadata.get("checks", [])

        # Update case status based on policy check
        if not policy_passed:
            if "exceeds autonomous limit" in str(action_res.policy_violations):
                case.status = RecoveryStatus.ESCALATED.value
            else:
                case.status = RecoveryStatus.STOPPED.value
            case_action_desc = f"Recovery blocked by policy: {action_res.reasoning_summary}"
        else:
            if auto_execute:
                case.status = RecoveryStatus.EXECUTING.value
                case.attempt_count += 1
                case_action_desc = f"Policy approved: Executing {recommended_strategy}"
            else:
                case.status = RecoveryStatus.APPROVED.value
                case_action_desc = f"Policy approved: Strategy {recommended_strategy} ready for execution"

        # Record Audit Logs for each agent decision
        for trace in agent_traces:
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
                    "latency_ms": trace.latency_ms,
                    "tokens": trace.tokens_used,
                    "model": trace.metadata.get("ai_model", settings.GEMINI_MODEL),
                },
            )
            session.add(audit)

        await session.commit()

        # Emit completion event to Redis & WebSockets
        await EventPublisher.publish_event(
            event_type=EventType.RECOVERY_CASE_UPDATED,
            merchant_id=merchant_id,
            case_id=case.id,
            data={
                "status": case.status,
                "strategy": case.recommended_strategy,
                "recoveryProbability": recovery_prob,
                "policyPassed": policy_passed,
                "riskScore": case.risk_score,
            },
        )

        total_latency_ms = int((time.perf_counter() - start_pipeline) * 1000)

        self.record_activity(
            agent_name="Action Agent",
            agent_type="learning",
            action="PIPELINE_COMPLETE",
            detail=f"Case {str(case.id)[:8]} set to {case.status} ({recommended_strategy})",
            status="success" if policy_passed else "warning",
            case_id=str(case.id),
        )

        return MultiAgentAnalysisResponse(
            caseId=case.id,
            status=case.status,
            riskScore=case.risk_score,
            recoveryProbability=recovery_prob,
            rootCause=case.root_cause,
            strategy=case.recommended_strategy,
            policyPassed=policy_passed,
            policyChecks=policy_checks,
            agentTraces=agent_traces,
            actionResult=case_action_desc,
            totalLatencyMs=total_latency_ms,
        )


coordinator = AgentCoordinator()
