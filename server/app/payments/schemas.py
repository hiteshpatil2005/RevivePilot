import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class PaymentEventCreate(BaseModel):
    transaction_id: Optional[uuid.UUID] = Field(None, alias="transactionId")
    customer_id: Optional[uuid.UUID] = Field(None, alias="customerId")
    event_type: str = Field(..., alias="eventType")
    amount: Optional[Decimal] = None
    currency: str = "INR"
    failure_reason: Optional[str] = Field(None, alias="failureReason")
    payment_method: str = Field("CARD", alias="paymentMethod")
    source: str = "MANUAL"
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True)


class PaymentEventResponse(BaseModel):
    id: str
    merchant_id: uuid.UUID = Field(..., alias="merchantId")
    transaction_id: uuid.UUID = Field(..., alias="transactionId")
    event_type: str = Field(..., alias="eventType")
    previous_status: Optional[str] = Field(None, alias="previousStatus")
    new_status: str = Field(..., alias="newStatus")
    amount: Decimal
    currency: str
    failure_reason: Optional[str] = Field(None, alias="failureReason")
    payment_method: str = Field(..., alias="paymentMethod")
    source: str
    idempotency_key: Optional[str] = Field(None, alias="idempotencyKey")
    metadata: Dict[str, Any] = Field(default_factory=dict, alias="metadata_")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @classmethod
    def model_validate(cls, obj: Any, *args, **kwargs):
        if hasattr(obj, "metadata_"):
            return cls(
                id=obj.id,
                merchant_id=obj.merchant_id,
                transaction_id=obj.transaction_id,
                event_type=obj.event_type,
                previous_status=obj.previous_status,
                new_status=obj.new_status,
                amount=obj.amount,
                currency=obj.currency,
                failure_reason=obj.failure_reason,
                payment_method=obj.payment_method,
                source=obj.source,
                idempotency_key=obj.idempotency_key,
                metadata_=obj.metadata_ if isinstance(obj.metadata_, dict) else {},
                created_at=obj.created_at,
            )
        return super().model_validate(obj, *args, **kwargs)


class PaymentEventListResponse(BaseModel):
    events: List[PaymentEventResponse]
    total: int
    page: int
    limit: int


class ManualPaymentTriggerRequest(BaseModel):
    scenario: Optional[str] = "NORMAL"
    amount: Optional[Decimal] = None
    failure_reason: Optional[str] = Field(None, alias="failureReason")
    payment_method: str = Field("CARD", alias="paymentMethod")
    customer_id: Optional[uuid.UUID] = Field(None, alias="customerId")

    model_config = ConfigDict(populate_by_name=True)


class SimulatorConfig(BaseModel):
    scenario: str = "FAILURE_SPIKE"  # NORMAL_TRAFFIC, FAILURE_SPIKE, BANK_TIMEOUT, INSUFFICIENT_FUNDS, HIGH_VALUE_FAILURE, MIXED_RISK
    events_per_minute: int = Field(10, alias="eventsPerMinute", ge=1, le=120)
    success_rate: Optional[float] = Field(None, alias="successRate")
    failure_rate: Optional[float] = Field(None, alias="failureRate")
    pending_rate: Optional[float] = Field(None, alias="pendingRate")
    high_value_probability: Optional[float] = Field(None, alias="highValueProbability")

    model_config = ConfigDict(populate_by_name=True)


class SimulatorStatusResponse(BaseModel):
    running: bool
    scenario: str
    events_per_minute: int = Field(..., alias="eventsPerMinute")
    total_events_emitted: int = Field(0, alias="totalEventsEmitted")
    started_at: Optional[datetime] = Field(None, alias="startedAt")

    model_config = ConfigDict(populate_by_name=True)
