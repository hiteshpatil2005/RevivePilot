from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    pagination: PaginationMeta


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None


class HealthCheckResponse(BaseModel):
    status: str
    service: str = "revivepilot-api"
    version: str = "1.0.0"
    services: Optional[dict] = None
