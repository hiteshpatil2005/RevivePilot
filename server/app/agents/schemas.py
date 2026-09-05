import uuid
import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class RevenueRisk(str, enum.Enum):
    NOT_REVENUE_RISK = "NOT_REVENUE_RISK"
    LOW_RISK = "LOW_RISK"
    MEDIUM_RISK = "MEDIUM_RISK"
    HIGH_RISK = "HIGH_RISK"
    CRITICAL = "CRITICAL"
    UNCERTAIN = "UNCERTAIN"


class DetectionUrgency(str, enum.Enum):
    ACT_NOW = "ACT_NOW"
    WAIT = "WAIT"
    INVESTIGATE = "INVESTIGATE"
    CONTACT_CUSTOMER = "CONTACT_CUSTOMER"
    REQUIRE_MERCHANT_APPROVAL = "REQUIRE_MERCHANT_APPROVAL"
    ESCALATE = "ESCALATE"
    STOP = "STOP"


class ActionEnum(str, enum.Enum):
    ASK_CUSTOMER = "ASK_CUSTOMER"
    HOLD = "HOLD"
    WAIT = "WAIT"
    RECHECK = "RECHECK"
    CUSTOMER_RETRY = "CUSTOMER_RETRY"
    ALTERNATIVE_PAYMENT_METHOD = "ALTERNATIVE_PAYMENT_METHOD"
    GENERATE_RECOVERY_LINK = "GENERATE_RECOVERY_LINK"
    REQUEST_MERCHANT_APPROVAL = "REQUEST_MERCHANT_APPROVAL"
    ESCALATE = "ESCALATE"
    STOP = "STOP"
    VERIFY_PAYMENT = "VERIFY_PAYMENT"


class FuturePlanStep(BaseModel):
    step: str  # NOW, NEXT, THEN, IF_CONFIRMED, IF_SUCCESS, IF_FAILS, IF_MAX_ATTEMPTS
    action: str
    description: str
    status: str = "upcoming"  # completed, current, upcoming, conditional

    model_config = ConfigDict(populate_by_name=True)


class RootCauseOutput(BaseModel):
    root_cause: str
    category: str
    confidence: float
    evidence: List[str] = Field(default_factory=list)
    recoverability: str = "HIGH"  # HIGH, MEDIUM, LOW, NONE, UNCERTAIN
    recoverability_reason: str = ""
    uncertainty: List[str] = Field(default_factory=list)
    recommended_next_stage: str = "STRATEGY"

    model_config = ConfigDict(populate_by_name=True)


class StrategyPlan(BaseModel):
    strategy_id: str
    objective: str
    current_state: str  # ON_HOLD, WAITING_FOR_CUSTOMER, READY_FOR_APPROVAL, APPROVED, etc.
    reason: str
    next_action: str
    wait_until: Optional[str] = None
    customer_contact_required: bool = False
    merchant_approval_required: bool = False
    smart_link_required: bool = False
    max_attempts: int = 3
    recovery_probability: int = 70
    probability_source: str = "SIMULATION_BASELINE"  # SIMULATION_BASELINE, MERCHANT_HISTORY
    stop_conditions: List[str] = Field(default_factory=list)
    escalation_conditions: List[str] = Field(default_factory=list)
    replan_conditions: List[str] = Field(default_factory=list)
    future_plan: List[FuturePlanStep] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class AgentContext(BaseModel):
    case_id: uuid.UUID = Field(..., alias="caseId")
    merchant_id: uuid.UUID = Field(..., alias="merchantId")
    transaction_id: uuid.UUID = Field(..., alias="transactionId")
    customer_id: uuid.UUID = Field(..., alias="customerId")
    amount: Decimal
    currency: str = "INR"
    failure_reason: str = Field(..., alias="failureReason")
    payment_method: str = Field("CARD", alias="paymentMethod")
    attempt_count: int = Field(0, alias="attemptCount")
    max_attempts: int = Field(3, alias="maxAttempts")
    customer_name: Optional[str] = Field(None, alias="customerName")
    customer_email: Optional[str] = Field(None, alias="customerEmail")
    customer_ltv: Optional[Decimal] = Field(None, alias="customerLtv")
    customer_failure_history: int = Field(0, alias="customerFailureHistory")
    customer_context: Dict[str, Any] = Field(default_factory=dict, alias="customerContext")
    replan_trigger: Optional[str] = Field(None, alias="replanTrigger")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class AgentResult(BaseModel):
    agent_name: str = Field(..., alias="agentName")
    decision: str
    confidence: int = Field(..., ge=0, le=100)
    reasoning_summary: str = Field(..., alias="reasoningSummary")
    recommended_strategy: Optional[str] = Field(None, alias="recommendedStrategy")
    recovery_probability: Optional[int] = Field(None, alias="recoveryProbability")
    policy_passed: Optional[bool] = Field(None, alias="policyPassed")
    policy_violations: List[str] = Field(default_factory=list, alias="policyViolations")
    action_taken: Optional[str] = Field(None, alias="actionTaken")
    action_enum: Optional[str] = Field(None, alias="actionEnum")
    next_action: Optional[str] = Field(None, alias="nextAction")
    evidence: List[str] = Field(default_factory=list)
    uncertainty: List[str] = Field(default_factory=list)
    future_plan: List[FuturePlanStep] = Field(default_factory=list, alias="futurePlan")
    latency_ms: int = Field(..., alias="latencyMs")
    tokens_used: int = Field(0, alias="tokensUsed")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class MultiAgentAnalysisResponse(BaseModel):
    case_id: uuid.UUID = Field(..., alias="caseId")
    status: str
    risk_score: int = Field(..., alias="riskScore")
    revenue_risk: str = Field("HIGH_RISK", alias="revenueRisk")
    recovery_probability: int = Field(..., alias="recoveryProbability")
    probability_source: str = Field("SIMULATION_BASELINE", alias="probabilitySource")
    expected_recovery_amount: Decimal = Field(default=Decimal("0.00"), alias="expectedRecoveryAmount")
    root_cause: str = Field(..., alias="rootCause")
    root_cause_category: Optional[str] = Field(None, alias="rootCauseCategory")
    strategy: str
    strategy_reason: Optional[str] = Field(None, alias="strategyReason")
    next_action: Optional[str] = Field(None, alias="nextAction")
    next_evaluation_at: Optional[datetime] = Field(None, alias="nextEvaluationAt")
    customer_context_required: bool = Field(False, alias="customerContextRequired")
    merchant_approval_required: bool = Field(False, alias="merchantApprovalRequired")
    smart_link_required: bool = Field(False, alias="smartLinkRequired")
    future_plan: List[FuturePlanStep] = Field(default_factory=list, alias="futurePlan")
    policy_passed: bool = Field(..., alias="policyPassed")
    policy_checks: List[Dict[str, Any]] = Field(default_factory=list, alias="policyChecks")
    agent_traces: List[AgentResult] = Field(default_factory=list, alias="agentTraces")
    action_result: Optional[str] = Field(None, alias="actionResult")
    total_latency_ms: int = Field(..., alias="totalLatencyMs")

    model_config = ConfigDict(populate_by_name=True)


class AgentStatus(BaseModel):
    id: str
    name: str
    description: str
    status: str  # online, processing, idle
    current_task: Optional[str] = Field(None, alias="currentTask")
    tasks_processed: int = Field(..., alias="tasksProcessed")
    success_rate: float = Field(..., alias="successRate")
    avg_latency: str = Field(..., alias="avgLatency")
    last_activity: str = Field(..., alias="lastActivity")
    type: str  # detection, rootcause, strategy, learning

    model_config = ConfigDict(populate_by_name=True)


class AgentActivity(BaseModel):
    id: str
    agent_name: str = Field(..., alias="agentName")
    agent_type: str = Field(..., alias="agentType")
    case_id: Optional[str] = Field(None, alias="caseId")
    action: str
    detail: str
    status: str  # success, warning, info, error
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True)
