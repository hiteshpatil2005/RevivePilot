import uuid
from datetime import datetime
from decimal import Decimal
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
    is_verified: bool = Field(False, alias="isVerified")
    card_number: Optional[str] = Field(None, alias="cardNumber")
    card_network: Optional[str] = Field("Visa", alias="cardNetwork")
    card_expiry: Optional[str] = Field("12/28", alias="cardExpiry")
    card_cvv: Optional[str] = Field(None, alias="cardCvv")
    upi_vpa: Optional[str] = Field(None, alias="upiVpa")
    bank_account_number: Optional[str] = Field(None, alias="bankAccountNumber")
    bank_name: Optional[str] = Field("HDFC Bank", alias="bankName")
    bank_ifsc: Optional[str] = Field("HDFC0001234", alias="bankIfsc")
    balance: Decimal = Field(Decimal("150000.00"), alias="balance")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CustomerListResponse(BaseModel):
    customers: List[CustomerResponse]
    total: int
    page: int
    limit: int


class CustomerPortalRegisterRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None


class CustomerPortalVerifyRequest(BaseModel):
    email: str
    code: str
