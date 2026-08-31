import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TransactionCustomer(BaseModel):
    id: uuid.UUID
    name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class TransactionBase(BaseModel):
    amount: Decimal = Field(..., decimal_places=2)
    currency: str = "INR"
    status: str = "PENDING"
    payment_method: Optional[str] = "CARD"
    failure_reason: Optional[str] = None
    external_payment_id: Optional[str] = None
    external_order_id: Optional[str] = None


class TransactionCreate(TransactionBase):
    customer_id: uuid.UUID


class TransactionResponse(TransactionBase):
    id: uuid.UUID
    merchant_id: uuid.UUID
    customer_id: uuid.UUID
    customer: Optional[TransactionCustomer] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
