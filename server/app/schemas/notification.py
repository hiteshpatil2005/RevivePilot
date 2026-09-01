import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class NotificationResponse(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID = Field(..., alias="merchantId")
    user_id: Optional[uuid.UUID] = Field(None, alias="userId")
    type: str
    title: str
    message: str
    read: bool
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(..., alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int = Field(..., alias="unreadCount")
    total: int

    model_config = ConfigDict(populate_by_name=True)
