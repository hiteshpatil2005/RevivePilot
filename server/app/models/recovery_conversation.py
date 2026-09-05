import uuid
from typing import Optional, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Index, Text, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.recovery_case import RecoveryCase
    from app.models.customer import Customer


class RecoveryConversation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "recovery_conversations"

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recovery_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    channel: Mapped[str] = mapped_column(String(50), nullable=False)  # CUSTOMER_PORTAL, MERCHANT_COCKPIT
    sender_type: Mapped[str] = mapped_column(String(50), nullable=False)  # CUSTOMER, MERCHANT, AI_AGENT, SYSTEM
    sender_name: Mapped[str] = mapped_column(String(100), default="Agent", nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), default=dict, nullable=True
    )

    merchant: Mapped["Merchant"] = relationship("Merchant")
    recovery_case: Mapped["RecoveryCase"] = relationship("RecoveryCase", back_populates="conversations")
    customer: Mapped[Optional["Customer"]] = relationship("Customer")

    __table_args__ = (
        Index("ix_rec_conv_case_created", "case_id", "created_at"),
        Index("ix_rec_conv_merchant_created", "merchant_id", "created_at"),
    )
