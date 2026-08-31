import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class MerchantBase(BaseModel):
    name: str
    email: EmailStr
    business_name: str
    currency: str = "INR"
    timezone: str = "Asia/Kolkata"


class MerchantCreate(MerchantBase):
    pass


class MerchantUpdate(BaseModel):
    name: Optional[str] = None
    business_name: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None


class MerchantResponse(MerchantBase):
    id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
