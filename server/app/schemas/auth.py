import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRegister(BaseModel):
    business_name: Optional[str] = Field(None, alias="businessName")
    full_name: Optional[str] = Field(None, alias="fullName")
    name: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=6)

    model_config = ConfigDict(populate_by_name=True)

    @property
    def resolved_name(self) -> str:
        return self.full_name or self.name or self.email.split("@")[0]

    @property
    def resolved_business_name(self) -> str:
        return self.business_name or f"{self.resolved_name}'s Business"


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
