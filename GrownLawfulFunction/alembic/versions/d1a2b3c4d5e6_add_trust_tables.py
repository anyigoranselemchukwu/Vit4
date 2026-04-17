"""add_trust_tables

Revision ID: d1a2b3c4d5e6
Revises: c9eb3528382c
Create Date: 2026-04-17 07:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd1a2b3c4d5e6'
down_revision: Union[str, None] = 'c9eb3528382c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_trust_scores',
        sa.Column('id',                 sa.Integer(),  primary_key=True, index=True),
        sa.Column('user_id',            sa.Integer(),  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('transaction_score',  sa.Float(),    nullable=False, default=50.0),
        sa.Column('prediction_score',   sa.Float(),    nullable=False, default=50.0),
        sa.Column('activity_score',     sa.Float(),    nullable=False, default=50.0),
        sa.Column('fraud_penalty',      sa.Float(),    nullable=False, default=0.0),
        sa.Column('composite_score',    sa.Float(),    nullable=False, default=50.0),
        sa.Column('risk_tier',          sa.String(16), nullable=False, default='medium'),
        sa.Column('total_flags',        sa.Integer(),  nullable=False, default=0),
        sa.Column('open_flags',         sa.Integer(),  nullable=False, default=0),
        sa.Column('last_calculated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_at',         sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_trust_composite', 'user_trust_scores', ['composite_score'])
    op.create_index('idx_trust_tier',      'user_trust_scores', ['risk_tier'])

    op.create_table(
        'fraud_flags',
        sa.Column('id',              sa.Integer(),  primary_key=True, index=True),
        sa.Column('user_id',         sa.Integer(),  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('flagged_by',      sa.String(32), nullable=False, default='system'),
        sa.Column('category',        sa.String(32), nullable=False),
        sa.Column('severity',        sa.String(16), nullable=False, default='medium'),
        sa.Column('rule_code',       sa.String(64), nullable=False),
        sa.Column('title',           sa.String(128), nullable=False),
        sa.Column('detail',          sa.Text(),     nullable=True),
        sa.Column('status',          sa.String(20), nullable=False, default='open'),
        sa.Column('reviewed_by_id',  sa.Integer(),  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reviewed_at',     sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolution_note', sa.Text(),     nullable=True),
        sa.Column('evidence_json',   sa.Text(),     nullable=True),
        sa.Column('created_at',      sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_flag_user_id',  'fraud_flags', ['user_id'])
    op.create_index('idx_flag_status',   'fraud_flags', ['status'])
    op.create_index('idx_flag_severity', 'fraud_flags', ['severity'])
    op.create_index('idx_flag_category', 'fraud_flags', ['category'])
    op.create_index('idx_flag_created',  'fraud_flags', ['created_at'])

    op.create_table(
        'risk_events',
        sa.Column('id',            sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id',       sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rule_code',     sa.String(64), nullable=False),
        sa.Column('score_impact',  sa.Float(),   nullable=False, default=0.0),
        sa.Column('detail',        sa.Text(),    nullable=True),
        sa.Column('evidence_json', sa.Text(),    nullable=True),
        sa.Column('created_at',    sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_risk_event_user',    'risk_events', ['user_id'])
    op.create_index('idx_risk_event_rule',    'risk_events', ['rule_code'])
    op.create_index('idx_risk_event_created', 'risk_events', ['created_at'])


def downgrade() -> None:
    op.drop_table('risk_events')
    op.drop_table('fraud_flags')
    op.drop_table('user_trust_scores')
