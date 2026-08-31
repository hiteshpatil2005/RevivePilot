import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Index
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
