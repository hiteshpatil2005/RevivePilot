import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Index, Boolean, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.merchant import Merchant
    from app.models.transaction import Transaction
    from app.models.recovery_case import RecoveryCase


class Customer(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "customers"

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    external_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    # Verification Lifecycle
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    verification_code_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Unique Assigned Payment Instruments per User
    card_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    card_network: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="Visa")
    card_expiry: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="12/28")
    card_cvv: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    upi_vpa: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bank_account_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="HDFC Bank")
    bank_ifsc: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="HDFC0001234")
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("150000.00"), nullable=False)

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="customers")
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction", back_populates="customer", cascade="all, delete-orphan"
    )
    recovery_cases: Mapped[List["RecoveryCase"]] = relationship(
        "RecoveryCase", back_populates="customer"
    )

    __table_args__ = (
        Index("ix_customers_merchant_email", "merchant_id", "email"),
    )
