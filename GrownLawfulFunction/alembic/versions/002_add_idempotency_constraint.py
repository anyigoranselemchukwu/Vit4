# alembic/versions/002_add_idempotency_constraint.py
"""Add idempotency constraints

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # For SQLite, we need to use batch mode to alter tables
    with op.batch_alter_table('predictions') as batch_op:
        # Add request_hash column for API idempotency
        batch_op.add_column(sa.Column('request_hash', sa.String(64), nullable=True))
        batch_op.create_index('idx_predictions_request_hash', ['request_hash'])
        batch_op.create_unique_constraint('uq_predictions_request_hash', ['request_hash'])
        # Note: SQLite doesn't support adding unique constraints to existing columns easily
        # The uq_predictions_match_id constraint would need to be handled differently


def downgrade() -> None:
    with op.batch_alter_table('predictions') as batch_op:
        batch_op.drop_constraint('uq_predictions_request_hash', type_='unique')
        batch_op.drop_index('idx_predictions_request_hash')
        batch_op.drop_column('request_hash')
    # Note: The uq_predictions_match_id constraint downgrade would need similar handling