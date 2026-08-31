from typing import List, TYPE_CHECKING
from sqlalchemy import String, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.customer import Customer
    from app.models.transaction import Transaction
    from app.models.recovery_case import RecoveryCase
    from app.models.policy import Policy
    from app.models.audit_log import AuditLog
    from app.models.notification import Notification


class Merchant(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "merchants"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User", back_populates="merchant", cascade="all, delete-orphan"
    )
    customers: Mapped[List["Customer"]] = relationship(
        "Customer", back_populates="merchant", cascade="all, delete-orphan"
    )
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction", back_populates="merchant", cascade="all, delete-orphan"
    )
    recovery_cases: Mapped[List["RecoveryCase"]] = relationship(
        "RecoveryCase", back_populates="merchant", cascade="all, delete-orphan"
    )
    policies: Mapped[List["Policy"]] = relationship(
        "Policy", back_populates="merchant", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog", back_populates="merchant", cascade="all, delete-orphan"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="merchant", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_merchants_email_status", "email", "status"),
    )
