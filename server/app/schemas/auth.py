import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator


class UserRegister(BaseModel):
    business_name: str = Field(..., alias="businessName", min_length=2)
    full_name: Optional[str] = Field(None, alias="fullName")
    name: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=6)

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def check_name_provided(self):
        if not (self.full_name or self.name or "").strip():
            raise ValueError("Full name is required.")
        return self

    @property
    def resolved_name(self) -> str:
        return (self.full_name or self.name or "").strip()

    @property
    def resolved_business_name(self) -> str:
        return self.business_name.strip()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID
    name: str
    fullName: str
    email: EmailStr
    role: str
    status: str
    businessName: Optional[str] = None
    avatarInitials: str = "RP"
    plan: str = "Growth"

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class TokenResponse(BaseModel):
    token: str
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    model_config = ConfigDict(populate_by_name=True)
