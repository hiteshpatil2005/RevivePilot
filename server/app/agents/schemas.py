import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


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
    latency_ms: int = Field(..., alias="latencyMs")
    tokens_used: int = Field(0, alias="tokensUsed")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class MultiAgentAnalysisResponse(BaseModel):
    case_id: uuid.UUID = Field(..., alias="caseId")
    status: str
    risk_score: int = Field(..., alias="riskScore")
    recovery_probability: int = Field(..., alias="recoveryProbability")
    root_cause: str = Field(..., alias="rootCause")
    strategy: str
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
