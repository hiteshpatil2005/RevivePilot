"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-08-31 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Merchants table
    op.create_table(
        'merchants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('business_name', sa.String(255), nullable=False),
        sa.Column('currency', sa.String(10), server_default='INR', nullable=False),
        sa.Column('timezone', sa.String(50), server_default='Asia/Kolkata', nullable=False),
        sa.Column('status', sa.String(50), server_default='ACTIVE', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_merchants_email', 'merchants', ['email'], unique=True)
    op.create_index('ix_merchants_email_status', 'merchants', ['email', 'status'])

    # 2. Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), server_default='OWNER', nullable=False),
        sa.Column('status', sa.String(50), server_default='ACTIVE', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_users_merchant_id', 'users', ['merchant_id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_merchant_role', 'users', ['merchant_id', 'role'])

    # 3. Customers table
    op.create_table(
        'customers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('external_customer_id', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_customers_merchant_id', 'customers', ['merchant_id'])
    op.create_index('ix_customers_email', 'customers', ['email'])
    op.create_index('ix_customers_merchant_email', 'customers', ['merchant_id', 'email'])
    op.create_index('ix_customers_external_customer_id', 'customers', ['external_customer_id'])

    # 4. Transactions table
    op.create_table(
        'transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('external_payment_id', sa.String(100), nullable=True),
        sa.Column('external_order_id', sa.String(100), nullable=True),
        sa.Column('amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('currency', sa.String(10), server_default='INR', nullable=False),
        sa.Column('status', sa.String(50), server_default='CREATED', nullable=False),
        sa.Column('payment_method', sa.String(50), server_default='CARD', nullable=True),
        sa.Column('failure_reason', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_transactions_merchant_id', 'transactions', ['merchant_id'])
    op.create_index('ix_transactions_customer_id', 'transactions', ['customer_id'])
    op.create_index('ix_transactions_status', 'transactions', ['status'])
    op.create_index('ix_transactions_external_payment_id', 'transactions', ['external_payment_id'])
    op.create_index('ix_transactions_merchant_status', 'transactions', ['merchant_id', 'status'])
    op.create_index('ix_transactions_merchant_created', 'transactions', ['merchant_id', 'created_at'])

    # 5. Recovery Cases table
    op.create_table(
        'recovery_cases',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('transactions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(50), server_default='DETECTED', nullable=False),
        sa.Column('risk_score', sa.Integer(), server_default='0', nullable=False),
        sa.Column('recovery_probability', sa.Integer(), server_default='0', nullable=False),
        sa.Column('root_cause', sa.String(255), nullable=True),
        sa.Column('recommended_strategy', sa.String(255), nullable=True),
        sa.Column('expected_recovery_amount', sa.Numeric(18, 2), server_default='0.00', nullable=False),
        sa.Column('actual_recovered_amount', sa.Numeric(18, 2), server_default='0.00', nullable=False),
        sa.Column('attempt_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('max_attempts', sa.Integer(), server_default='3', nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_recovery_cases_merchant_id', 'recovery_cases', ['merchant_id'])
    op.create_index('ix_recovery_cases_transaction_id', 'recovery_cases', ['transaction_id'])
    op.create_index('ix_recovery_cases_customer_id', 'recovery_cases', ['customer_id'])
    op.create_index('ix_recovery_cases_status', 'recovery_cases', ['status'])
    op.create_index('ix_recovery_cases_merchant_status', 'recovery_cases', ['merchant_id', 'status'])
    op.create_index('ix_recovery_cases_merchant_created', 'recovery_cases', ['merchant_id', 'created_at'])
    op.create_index('ix_recovery_cases_status_created', 'recovery_cases', ['status', 'created_at'])

    # 6. Policies table
    op.create_table(
        'policies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('configuration', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_policies_merchant_id', 'policies', ['merchant_id'])
    op.create_index('ix_policies_type', 'policies', ['type'])
    op.create_index('ix_policies_merchant_type', 'policies', ['merchant_id', 'type'])

    # 7. Audit Logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('recovery_case_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('recovery_cases.id', ondelete='CASCADE'), nullable=True),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('actor_type', sa.String(50), server_default='SYSTEM', nullable=False),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('metadata', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_audit_logs_merchant_id', 'audit_logs', ['merchant_id'])
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_recovery_case_id', 'audit_logs', ['recovery_case_id'])
    op.create_index('ix_audit_logs_event_type', 'audit_logs', ['event_type'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('ix_audit_logs_merchant_created', 'audit_logs', ['merchant_id', 'created_at'])
    op.create_index('ix_audit_logs_merchant_event_created', 'audit_logs', ['merchant_id', 'event_type', 'created_at'])

    # 8. Notifications table
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('type', sa.String(50), server_default='SYSTEM', nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.String(500), nullable=False),
        sa.Column('read', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('metadata', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_notifications_merchant_id', 'notifications', ['merchant_id'])
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_read', 'notifications', ['read'])
    op.create_index('ix_notifications_merchant_read', 'notifications', ['merchant_id', 'read'])
    op.create_index('ix_notifications_merchant_created', 'notifications', ['merchant_id', 'created_at'])


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('audit_logs')
    op.drop_table('policies')
    op.drop_table('recovery_cases')
    op.drop_table('transactions')
    op.drop_table('customers')
    op.drop_table('users')
    op.drop_table('merchants')
