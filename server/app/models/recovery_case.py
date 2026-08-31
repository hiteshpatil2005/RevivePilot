import uuid
import enum
from decimal import Decimal
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.transaction import Transaction
    from app.models.customer import Customer
    from app.models.audit_log import AuditLog


class RecoveryStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    ANALYZING = "ANALYZING"
    ROOT_CAUSE_IDENTIFIED = "ROOT_CAUSE_IDENTIFIED"
    STRATEGY_SELECTED = "STRATEGY_SELECTED"
    POLICY_REVIEW = "POLICY_REVIEW"
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"
    EXECUTING = "EXECUTING"
    RECOVERED = "RECOVERED"
    FAILED = "FAILED"
    ESCALATED = "ESCALATED"
    STOPPED = "STOPPED"


class RecoveryCase(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "recovery_cases"

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(50), default=RecoveryStatus.DETECTED.value, nullable=False, index=True
    )
    risk_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recovery_probability: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    root_cause: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recommended_strategy: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    expected_recovery_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0.00"), nullable=False
    )
    actual_recovered_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), default=Decimal("0.00"), nullable=False
    )

    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="recovery_cases")
    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="recovery_cases")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="recovery_cases")
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog", back_populates="recovery_case", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_recovery_cases_merchant_status", "merchant_id", "status"),
        Index("ix_recovery_cases_merchant_created", "merchant_id", "created_at"),
        Index("ix_recovery_cases_status_created", "status", "created_at"),
    )
