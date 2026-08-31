import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class AuditLogBase(BaseModel):
    event_type: str
    actor_type: str = "SYSTEM"
    description: str
    metadata: Dict[str, Any] = Field(default_factory=dict, alias="metadata_")

    model_config = ConfigDict(populate_by_name=True)


class AuditLogCreate(AuditLogBase):
    recovery_case_id: Optional[uuid.UUID] = None


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    recovery_case_id: Optional[uuid.UUID] = None
    event_type: str
    eventType: str = ""
    actor_type: str
    actor: str = "SYSTEM"
    action: str = ""
    description: str
    detail: str = ""
    result: str = "SUCCESS"
    decision: str = ""
    reason: str = ""
    caseId: str = "—"
    metadata: Dict[str, Any] = {}
    timestamp: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
