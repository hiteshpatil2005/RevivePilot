import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class PolicyCheckItem(BaseModel):
    label: str
    value: str
    passed: bool


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

    policyChecks: List[PolicyCheckItem] = []
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RecoveryCaseListResponse(BaseModel):
    cases: List[RecoveryCaseResponse]
    total: int
    page: int = 1
    limit: int = 50
