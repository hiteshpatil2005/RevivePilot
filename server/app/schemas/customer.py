import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    external_customer_id: Optional[str] = Field(None, alias="externalCustomerId")


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class CustomerResponse(CustomerBase):
    id: uuid.UUID
    merchant_id: uuid.UUID = Field(..., alias="merchantId")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CustomerListResponse(BaseModel):
    customers: List[CustomerResponse]
    total: int
    page: int
    limit: int
