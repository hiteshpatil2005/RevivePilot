"""payment_events table

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'payment_events',
        sa.Column('id', sa.String(100), primary_key=True),
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('transactions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('previous_status', sa.String(50), nullable=True),
        sa.Column('new_status', sa.String(50), nullable=False),
        sa.Column('amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('currency', sa.String(10), server_default='INR', nullable=False),
        sa.Column('failure_reason', sa.String(100), nullable=True),
        sa.Column('payment_method', sa.String(50), server_default='CARD', nullable=False),
        sa.Column('source', sa.String(50), server_default='SIMULATOR', nullable=False),
        sa.Column('idempotency_key', sa.String(100), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_payment_events_merchant_id', 'payment_events', ['merchant_id'])
    op.create_index('ix_payment_events_transaction_id', 'payment_events', ['transaction_id'])
    op.create_index('ix_payment_events_event_type', 'payment_events', ['event_type'])
    op.create_index('ix_payment_events_idempotency_key', 'payment_events', ['idempotency_key'])
    op.create_index('ix_payment_events_created_at', 'payment_events', ['created_at'])
    op.create_index('ix_payment_events_merchant_created', 'payment_events', ['merchant_id', 'created_at'])
    op.create_index('ix_payment_events_merchant_idempotency', 'payment_events', ['merchant_id', 'idempotency_key'])
    op.create_index('ix_payment_events_txn_created', 'payment_events', ['transaction_id', 'created_at'])


def downgrade() -> None:
    op.drop_table('payment_events')
