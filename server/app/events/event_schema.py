import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from app.events.event_types import EventType


class EventSchema(BaseModel):
    """
    Standard event schema for all Redis pub/sub and WebSocket broadcast messages.
    """
    event_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    event_type: EventType
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    merchant_id: uuid.UUID
    case_id: Optional[uuid.UUID] = None
    data: Dict[str, Any] = Field(default_factory=dict)
