import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy import (
    String,
    Numeric,
    DateTime,
    ForeignKey,
    Index,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class PaymentEvent(Base):
    """
    Immutable payment event log capturing every state transition,
    simulation trigger, and payment outcome for audit and event streaming.
    """
    __tablename__ = "payment_events"

    id: Mapped[str] = mapped_column(
        String(100),
        primary_key=True,
        default=lambda: f"evt_{uuid.uuid4().hex[:16]}",
    )
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
    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    previous_status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    new_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        default="INR",
        nullable=False,
    )
    failure_reason: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    payment_method: Mapped[str] = mapped_column(
        String(50),
        default="CARD",
        nullable=False,
    )
    source: Mapped[str] = mapped_column(
        String(50),
        default="SIMULATOR",
        nullable=False,
    )
    idempotency_key: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    metadata_: Mapped[Dict[str, Any]] = mapped_column(
        "metadata",
        JSONB().with_variant(JSON(), "sqlite"),
        default=dict,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationships
    merchant = relationship("Merchant", lazy="joined")
    transaction = relationship("Transaction", lazy="joined")

    __table_args__ = (
        Index("ix_payment_events_merchant_created", "merchant_id", "created_at"),
        Index("ix_payment_events_merchant_idempotency", "merchant_id", "idempotency_key"),
        Index("ix_payment_events_txn_created", "transaction_id", "created_at"),
    )
