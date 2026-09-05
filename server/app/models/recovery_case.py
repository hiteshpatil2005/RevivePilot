import uuid
import enum
from decimal import Decimal
from datetime import datetime
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, Index, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.transaction import Transaction
    from app.models.customer import Customer
    from app.models.audit_log import AuditLog
    from app.models.agent_execution import AgentExecution
    from app.models.recovery_conversation import RecoveryConversation


class RecoveryStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    INVESTIGATING = "INVESTIGATING"
    ANALYZING = "ANALYZING"
    ROOT_CAUSE_IDENTIFIED = "ROOT_CAUSE_IDENTIFIED"
    STRATEGY_PLANNED = "STRATEGY_PLANNED"
    STRATEGY_SELECTED = "STRATEGY_SELECTED"
    WAITING_FOR_CONTEXT = "WAITING_FOR_CONTEXT"
    WAITING_FOR_CUSTOMER = "WAITING_FOR_CUSTOMER"
    ON_HOLD = "ON_HOLD"
    READY_FOR_APPROVAL = "READY_FOR_APPROVAL"
    POLICY_REVIEW = "POLICY_REVIEW"
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"
    ACTION_PENDING = "ACTION_PENDING"
    ACTION_EXECUTING = "ACTION_EXECUTING"
    EXECUTING = "EXECUTING"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    VERIFYING = "VERIFYING"
    RECOVERED = "RECOVERED"
    FAILED = "FAILED"
    ESCALATED = "ESCALATED"
    STOPPED = "STOPPED"
    EXPIRED = "EXPIRED"
    UNRECOVERABLE = "UNRECOVERABLE"


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

    # Extended Deep Recovery Intelligence Fields
    current_strategy: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    strategy_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    strategy_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    strategy_confidence: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    next_action: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    next_evaluation_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    customer_context: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )
    customer_expected_retry_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    merchant_approval_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    merchant_approval_status: Mapped[str] = mapped_column(String(50), default="NOT_REQUIRED", nullable=False)

    smart_link_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    smart_link_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
    smart_link_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    smart_link_status: Mapped[str] = mapped_column(String(50), default="NONE", nullable=False)

    stop_conditions: Mapped[Optional[List[str]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=list, nullable=True
    )
    escalation_conditions: Mapped[Optional[List[str]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=list, nullable=True
    )
    replan_conditions: Mapped[Optional[List[str]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=list, nullable=True
    )
    future_plan: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=list, nullable=True
    )

    replan_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_agent_decision: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="recovery_cases")
    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="recovery_cases")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="recovery_cases")
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog", back_populates="recovery_case", cascade="all, delete-orphan"
    )
    agent_executions: Mapped[List["AgentExecution"]] = relationship(
        "AgentExecution", back_populates="recovery_case", cascade="all, delete-orphan"
    )
    conversations: Mapped[List["RecoveryConversation"]] = relationship(
        "RecoveryConversation", back_populates="recovery_case", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_recovery_cases_merchant_status", "merchant_id", "status"),
        Index("ix_recovery_cases_merchant_created", "merchant_id", "created_at"),
        Index("ix_recovery_cases_status_created", "status", "created_at"),
        Index("ix_recovery_cases_smart_link_token", "smart_link_token"),
    )
