"""agentic recovery upgrade

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-05 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add extended columns to recovery_cases
    op.add_column('recovery_cases', sa.Column('current_strategy', sa.String(100), nullable=True))
    op.add_column('recovery_cases', sa.Column('strategy_version', sa.Integer(), server_default='1', nullable=False))
    op.add_column('recovery_cases', sa.Column('strategy_reason', sa.Text(), nullable=True))
    op.add_column('recovery_cases', sa.Column('strategy_confidence', sa.Integer(), nullable=True))
    op.add_column('recovery_cases', sa.Column('next_action', sa.String(100), nullable=True))
    op.add_column('recovery_cases', sa.Column('next_evaluation_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('recovery_cases', sa.Column('customer_context', postgresql.JSONB(), server_default='{}', nullable=True))
    op.add_column('recovery_cases', sa.Column('customer_expected_retry_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('recovery_cases', sa.Column('merchant_approval_required', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('recovery_cases', sa.Column('merchant_approval_status', sa.String(50), server_default='NOT_REQUIRED', nullable=False))
    op.add_column('recovery_cases', sa.Column('smart_link_required', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('recovery_cases', sa.Column('smart_link_token', sa.String(255), nullable=True))
    op.add_column('recovery_cases', sa.Column('smart_link_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('recovery_cases', sa.Column('smart_link_status', sa.String(50), server_default='NONE', nullable=False))
    op.add_column('recovery_cases', sa.Column('stop_conditions', postgresql.JSONB(), server_default='[]', nullable=True))
    op.add_column('recovery_cases', sa.Column('escalation_conditions', postgresql.JSONB(), server_default='[]', nullable=True))
    op.add_column('recovery_cases', sa.Column('replan_conditions', postgresql.JSONB(), server_default='[]', nullable=True))
    op.add_column('recovery_cases', sa.Column('future_plan', postgresql.JSONB(), server_default='[]', nullable=True))
    op.add_column('recovery_cases', sa.Column('replan_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('recovery_cases', sa.Column('last_agent_decision', sa.String(100), nullable=True))

    op.create_index('ix_recovery_cases_smart_link_token', 'recovery_cases', ['smart_link_token'], unique=True)

    # 2. Create agent_executions table
    op.create_table(
        'agent_executions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('case_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('recovery_cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_name', sa.String(100), nullable=False),
        sa.Column('agent_type', sa.String(50), nullable=False),
        sa.Column('decision', sa.String(100), nullable=False),
        sa.Column('confidence', sa.Integer(), server_default='0', nullable=False),
        sa.Column('latency_ms', sa.Integer(), server_default='0', nullable=False),
        sa.Column('tokens_used', sa.Integer(), server_default='0', nullable=False),
        sa.Column('model', sa.String(100), server_default='gemini-2.5-flash', nullable=False),
        sa.Column('input_summary', sa.Text(), nullable=True),
        sa.Column('output_data', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('status', sa.String(50), server_default='SUCCESS', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_agent_executions_merchant_created', 'agent_executions', ['merchant_id', 'created_at'])
    op.create_index('ix_agent_executions_case_created', 'agent_executions', ['case_id', 'created_at'])

    # 3. Create recovery_conversations table
    op.create_table(
        'recovery_conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('merchant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('merchants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('case_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('recovery_cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('customers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('channel', sa.String(50), nullable=False),
        sa.Column('sender_type', sa.String(50), nullable=False),
        sa.Column('sender_name', sa.String(100), server_default='Agent', nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('metadata_', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_rec_conv_case_created', 'recovery_conversations', ['case_id', 'created_at'])
    op.create_index('ix_rec_conv_merchant_created', 'recovery_conversations', ['merchant_id', 'created_at'])


def downgrade() -> None:
    op.drop_table('recovery_conversations')
    op.drop_table('agent_executions')
    op.drop_index('ix_recovery_cases_smart_link_token', table_name='recovery_cases')
    op.drop_column('recovery_cases', 'last_agent_decision')
    op.drop_column('recovery_cases', 'replan_count')
    op.drop_column('recovery_cases', 'future_plan')
    op.drop_column('recovery_cases', 'replan_conditions')
    op.drop_column('recovery_cases', 'escalation_conditions')
    op.drop_column('recovery_cases', 'stop_conditions')
    op.drop_column('recovery_cases', 'smart_link_status')
    op.drop_column('recovery_cases', 'smart_link_expires_at')
    op.drop_column('recovery_cases', 'smart_link_token')
    op.drop_column('recovery_cases', 'smart_link_required')
    op.drop_column('recovery_cases', 'merchant_approval_status')
    op.drop_column('recovery_cases', 'merchant_approval_required')
    op.drop_column('recovery_cases', 'customer_expected_retry_at')
    op.drop_column('recovery_cases', 'customer_context')
    op.drop_column('recovery_cases', 'next_evaluation_at')
    op.drop_column('recovery_cases', 'next_action')
    op.drop_column('recovery_cases', 'strategy_confidence')
    op.drop_column('recovery_cases', 'strategy_reason')
    op.drop_column('recovery_cases', 'strategy_version')
    op.drop_column('recovery_cases', 'current_strategy')
