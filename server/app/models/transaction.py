import uuid
import enum
from decimal import Decimal
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.customer import Customer
    from app.models.recovery_case import RecoveryCase


class TransactionStatus(str, enum.Enum):
    CREATED = "CREATED"
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class Transaction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "transactions"

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_payment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    external_order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Financial money representation: exact NUMERIC(18, 2)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)

    status: Mapped[str] = mapped_column(
        String(50), default=TransactionStatus.CREATED.value, nullable=False, index=True
    )
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), default="CARD", nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="transactions")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="transactions")
    recovery_cases: Mapped[List["RecoveryCase"]] = relationship(
        "RecoveryCase", back_populates="transaction", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_transactions_merchant_status", "merchant_id", "status"),
        Index("ix_transactions_merchant_created", "merchant_id", "created_at"),
    )
