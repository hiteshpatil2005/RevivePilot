import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, ConfigDict, Field


class PolicyBase(BaseModel):
    name: str
    type: str
    enabled: bool = True
    configuration: Dict[str, Any] = {}


class PolicyCreate(PolicyBase):
    pass


class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    enabled: Optional[bool] = None
    configuration: Optional[Dict[str, Any]] = None


class PolicyResponse(PolicyBase):
    id: uuid.UUID
    merchant_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PolicyEvaluationRequest(BaseModel):
    amount: float
    retryCount: int = Field(0, alias="retry_count")
    aiConfidence: int = Field(90, alias="ai_confidence")
    recoveryProbability: int = Field(80, alias="recovery_probability")

    model_config = ConfigDict(populate_by_name=True)


class PolicyCheckResult(BaseModel):
    label: str
    pass_: bool = Field(..., alias="pass")
    value: str
    note: str

    model_config = ConfigDict(populate_by_name=True)


class PolicyEvaluationResponse(BaseModel):
    decision: str  # APPROVED | BLOCKED | MANUAL_APPROVAL
    checks: List[PolicyCheckResult]
    type: str  # approved | blocked | manual
