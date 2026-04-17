# alembic/versions/c9eb3528382c_add_marketplace_tables.py
"""add_marketplace_tables

Revision ID: c9eb3528382c
Revises: e39e02baf2be
Create Date: 2026-04-17 06:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c9eb3528382c'
down_revision: Union[str, None] = 'e39e02baf2be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'marketplace_listings',
        sa.Column('id',               sa.Integer(),      primary_key=True, index=True),
        sa.Column('creator_id',       sa.Integer(),      sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name',             sa.String(128),    nullable=False),
        sa.Column('slug',             sa.String(128),    nullable=False, unique=True),
        sa.Column('description',      sa.Text(),         nullable=True),
        sa.Column('category',         sa.String(64),     nullable=False, default='prediction'),
        sa.Column('tags',             sa.String(255),    nullable=True),
        sa.Column('price_per_call',   sa.Numeric(20, 8), nullable=False, default=1),
        sa.Column('model_key',        sa.String(64),     nullable=True),
        sa.Column('total_revenue',    sa.Numeric(20, 8), nullable=False, default=0),
        sa.Column('creator_revenue',  sa.Numeric(20, 8), nullable=False, default=0),
        sa.Column('protocol_revenue', sa.Numeric(20, 8), nullable=False, default=0),
        sa.Column('usage_count',      sa.Integer(),      nullable=False, default=0),
        sa.Column('rating_sum',       sa.Float(),        nullable=False, default=0),
        sa.Column('rating_count',     sa.Integer(),      nullable=False, default=0),
        sa.Column('is_active',        sa.Boolean(),      nullable=False, default=True),
        sa.Column('is_verified',      sa.Boolean(),      nullable=False, default=False),
        sa.Column('created_at',       sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at',       sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_listing_creator_id', 'marketplace_listings', ['creator_id'])
    op.create_index('idx_listing_category',   'marketplace_listings', ['category'])
    op.create_index('idx_listing_is_active',  'marketplace_listings', ['is_active'])

    op.create_table(
        'marketplace_usage_logs',
        sa.Column('id',              sa.Integer(),      primary_key=True, index=True),
        sa.Column('listing_id',      sa.Integer(),      sa.ForeignKey('marketplace_listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('caller_id',       sa.Integer(),      sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('vitcoin_charged', sa.Numeric(20, 8), nullable=False),
        sa.Column('creator_share',   sa.Numeric(20, 8), nullable=False),
        sa.Column('protocol_share',  sa.Numeric(20, 8), nullable=False),
        sa.Column('input_summary',   sa.Text(),         nullable=True),
        sa.Column('output_summary',  sa.Text(),         nullable=True),
        sa.Column('status',          sa.String(20),     nullable=False, default='success'),
        sa.Column('called_at',       sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_usage_listing_id', 'marketplace_usage_logs', ['listing_id'])
    op.create_index('idx_usage_caller_id',  'marketplace_usage_logs', ['caller_id'])
    op.create_index('idx_usage_called_at',  'marketplace_usage_logs', ['called_at'])

    op.create_table(
        'marketplace_ratings',
        sa.Column('id',         sa.Integer(), primary_key=True, index=True),
        sa.Column('listing_id', sa.Integer(), sa.ForeignKey('marketplace_listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id',    sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stars',      sa.Integer(), nullable=False),
        sa.Column('review',     sa.Text(),    nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('listing_id', 'user_id', name='uq_rating_listing_user'),
    )
    op.create_index('idx_rating_listing_id', 'marketplace_ratings', ['listing_id'])


def downgrade() -> None:
    op.drop_table('marketplace_ratings')
    op.drop_table('marketplace_usage_logs')
    op.drop_table('marketplace_listings')
