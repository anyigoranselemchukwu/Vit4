# alembic/versions/e39e02baf2be_add_notification_tables.py
"""add_notification_tables

Revision ID: e39e02baf2be
Revises: 004
Create Date: 2026-04-17 05:50:48.977505

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e39e02baf2be'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, default=False),
        sa.Column('channel', sa.String(30), nullable=False, default='in_app'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    op.create_table(
        'notification_preferences',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('prediction_alerts', sa.Boolean(), nullable=False, default=True),
        sa.Column('match_results', sa.Boolean(), nullable=False, default=True),
        sa.Column('wallet_activity', sa.Boolean(), nullable=False, default=True),
        sa.Column('validator_rewards', sa.Boolean(), nullable=False, default=True),
        sa.Column('subscription_expiry', sa.Boolean(), nullable=False, default=True),
        sa.Column('email_enabled', sa.Boolean(), nullable=False, default=False),
        sa.Column('telegram_enabled', sa.Boolean(), nullable=False, default=False),
        sa.Column('in_app_enabled', sa.Boolean(), nullable=False, default=True),
    )


def downgrade() -> None:
    op.drop_table('notification_preferences')
    op.drop_table('notifications')
