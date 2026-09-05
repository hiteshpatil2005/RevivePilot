import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class PolicyCheckItem(BaseModel):
    label: str
    value: str
    passed: bool


class RecoveryTimelineEvent(BaseModel):
    id: Optional[str] = None
    event_type: str = Field(..., alias="eventType")
    timestamp: datetime
    description: str
    actor: str = "SYSTEM"
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # UI fields for AIRecoveryTimeline
    step: Optional[str] = None
    label: Optional[str] = None
    detail: Optional[str] = None
    ts: Optional[str] = None
    status: Optional[str] = "done"

    model_config = ConfigDict(populate_by_name=True)


class RecoveryCaseBase(BaseModel):
    status: str = "DETECTED"
    risk_score: int = 0
    recovery_probability: int = 0
    root_cause: Optional[str] = None
    recommended_strategy: Optional[str] = None
    expected_recovery_amount: Decimal = Field(default=Decimal("0.00"), decimal_places=2)
    actual_recovered_amount: Decimal = Field(default=Decimal("0.00"), decimal_places=2)
    attempt_count: int = 0
    max_attempts: int = 3


class RecoveryCaseCreate(RecoveryCaseBase):
    transaction_id: uuid.UUID
    customer_id: uuid.UUID


class RecoveryCaseActionRequest(BaseModel):
    reason: Optional[str] = None


class RecoveryCaseResponse(RecoveryCaseBase):
    id: uuid.UUID
    merchant_id: uuid.UUID
    transaction_id: uuid.UUID
    customer_id: uuid.UUID

    # Customer & Payment Details
    customer_name: Optional[str] = Field(None, alias="customerName")
    customer_email: Optional[str] = Field(None, alias="customerEmail")
    payment_method: Optional[str] = Field(None, alias="paymentMethod")
    external_payment_id: Optional[str] = Field(None, alias="externalPaymentId")
    external_order_id: Optional[str] = Field(None, alias="externalOrderId")

    # Deep Recovery Intelligence Extensions
    current_strategy: Optional[str] = Field(None, alias="currentStrategy")
    strategy_version: int = Field(1, alias="strategyVersion")
    strategy_reason: Optional[str] = Field(None, alias="strategyReason")
    strategy_confidence: Optional[int] = Field(None, alias="strategyConfidence")
    next_action: Optional[str] = Field(None, alias="nextAction")
    next_evaluation_at: Optional[datetime] = Field(None, alias="nextEvaluationAt")
    customer_context: Optional[Dict[str, Any]] = Field(default_factory=dict, alias="customerContext")
    customer_expected_retry_at: Optional[datetime] = Field(None, alias="customerExpectedRetryAt")
    merchant_approval_required: bool = Field(False, alias="merchantApprovalRequired")
    merchant_approval_status: str = Field("NOT_REQUIRED", alias="merchantApprovalStatus")
    smart_link_required: bool = Field(False, alias="smartLinkRequired")
    smart_link_token: Optional[str] = Field(None, alias="smartLinkToken")
    smart_link_expires_at: Optional[datetime] = Field(None, alias="smartLinkExpiresAt")
    smart_link_status: str = Field("NONE", alias="smartLinkStatus")
    stop_conditions: List[str] = Field(default_factory=list, alias="stopConditions")
    escalation_conditions: List[str] = Field(default_factory=list, alias="escalationConditions")
    replan_conditions: List[str] = Field(default_factory=list, alias="replanConditions")
    future_plan: List[Dict[str, Any]] = Field(default_factory=list, alias="futurePlan")
    replan_count: int = Field(0, alias="replanCount")
    last_agent_decision: Optional[str] = Field(None, alias="lastAgentDecision")

    # Aliases / computed helpers for frontend compatibility
    amount: Optional[Decimal] = None
    priority: str = "medium"
    customerId: Optional[str] = None
    transactionId: Optional[str] = None
    rootCause: Optional[str] = None
    strategy: Optional[str] = None
    riskScore: Optional[int] = None
    recoveryProbability: Optional[int] = None
    expectedRecovery: Optional[Decimal] = None
    actualRecoveredAmount: Optional[Decimal] = None

    policyChecks: List[PolicyCheckItem] = []
    timeline: List[RecoveryTimelineEvent] = []
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class RecoveryCaseListResponse(BaseModel):
    cases: List[RecoveryCaseResponse]
    total: int
    page: int = 1
    limit: int = 50


class MerchantChatRequest(BaseModel):
    message: str


class MerchantChatResponse(BaseModel):
    reply: str
    confidence: int = 95
    actionable_suggestion: Optional[str] = None


class CustomerChatRequest(BaseModel):
    message: Optional[str] = None
    selected_option: Optional[str] = None


class CustomerChatResponse(BaseModel):
    reply: str
    case_status: str
    strategy: str
    next_action: str


class StrategyApprovalRequest(BaseModel):
    action: str = "APPROVE"  # APPROVE, REJECT
    notes: Optional[str] = None
