"""Add blockchain economy and training module tables.

Revision ID: 004
Revises: 003
Create Date: 2026-04-16

Adds:
  - validator_profiles
  - validator_predictions
  - consensus_predictions
  - oracle_results
  - match_settlements
  - user_stakes
  - module_training_jobs
  - module_training_guide_steps
"""

from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── validator_profiles ─────────────────────────────────────────────
    op.create_table(
        "validator_profiles",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("stake_amount", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("trust_score", sa.Numeric(5, 4), nullable=False, server_default="0.5000"),
        sa.Column("total_predictions", sa.Integer, nullable=False, server_default="0"),
        sa.Column("accurate_predictions", sa.Integer, nullable=False, server_default="0"),
        sa.Column("influence_score", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_active", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_validator_user_id", "validator_profiles", ["user_id"])
    op.create_index("idx_validator_status", "validator_profiles", ["status"])
    op.create_index("idx_validator_trust_score", "validator_profiles", ["trust_score"])

    # ── validator_predictions ──────────────────────────────────────────
    op.create_table(
        "validator_predictions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("validator_id", sa.String(36), sa.ForeignKey("validator_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("match_id", sa.String(100), nullable=False),
        sa.Column("p_home", sa.Numeric(5, 4), nullable=False),
        sa.Column("p_draw", sa.Numeric(5, 4), nullable=False),
        sa.Column("p_away", sa.Numeric(5, 4), nullable=False),
        sa.Column("confidence", sa.Numeric(5, 4), server_default="0.5"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("result", sa.String(20), server_default="pending"),
        sa.Column("trust_delta", sa.Numeric(6, 4), nullable=True),
        sa.Column("reward_earned", sa.Numeric(20, 8), server_default="0"),
        sa.UniqueConstraint("validator_id", "match_id", name="uq_validator_match_prediction"),
    )
    op.create_index("idx_val_pred_match_id", "validator_predictions", ["match_id"])
    op.create_index("idx_val_pred_validator_id", "validator_predictions", ["validator_id"])

    # ── consensus_predictions ──────────────────────────────────────────
    op.create_table(
        "consensus_predictions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("match_id", sa.String(100), unique=True, nullable=False),
        sa.Column("match_data", sa.JSON, nullable=True),
        sa.Column("ai_p_home", sa.Numeric(5, 4), server_default="0"),
        sa.Column("ai_p_draw", sa.Numeric(5, 4), server_default="0"),
        sa.Column("ai_p_away", sa.Numeric(5, 4), server_default="0"),
        sa.Column("ai_confidence", sa.Numeric(5, 4), server_default="0"),
        sa.Column("ai_risk", sa.Numeric(5, 4), server_default="0"),
        sa.Column("validator_count", sa.Integer, server_default="0"),
        sa.Column("consensus_p_home", sa.Numeric(5, 4), server_default="0"),
        sa.Column("consensus_p_draw", sa.Numeric(5, 4), server_default="0"),
        sa.Column("consensus_p_away", sa.Numeric(5, 4), server_default="0"),
        sa.Column("final_p_home", sa.Numeric(5, 4), server_default="0"),
        sa.Column("final_p_draw", sa.Numeric(5, 4), server_default="0"),
        sa.Column("final_p_away", sa.Numeric(5, 4), server_default="0"),
        sa.Column("total_influence", sa.Numeric(20, 8), server_default="0"),
        sa.Column("status", sa.String(20), server_default="open"),
        sa.Column("published_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("settled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_consensus_match_id", "consensus_predictions", ["match_id"])
    op.create_index("idx_consensus_status", "consensus_predictions", ["status"])

    # ── oracle_results ─────────────────────────────────────────────────
    op.create_table(
        "oracle_results",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("match_id", sa.String(100), nullable=False),
        sa.Column("source", sa.String(100), nullable=False),
        sa.Column("home_score", sa.Integer, nullable=False),
        sa.Column("away_score", sa.Integer, nullable=False),
        sa.Column("result", sa.String(10), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_accepted", sa.Boolean, server_default="0"),
        sa.Column("dispute_flag", sa.Boolean, server_default="0"),
        sa.UniqueConstraint("match_id", "source", name="uq_oracle_match_source"),
    )
    op.create_index("idx_oracle_match_id", "oracle_results", ["match_id"])
    op.create_index("idx_oracle_dispute", "oracle_results", ["dispute_flag"])

    # ── match_settlements ──────────────────────────────────────────────
    op.create_table(
        "match_settlements",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("match_id", sa.String(100), unique=True, nullable=False),
        sa.Column("consensus_id", sa.String(36), sa.ForeignKey("consensus_predictions.id"), nullable=False),
        sa.Column("oracle_result", sa.String(10), nullable=False),
        sa.Column("total_pool", sa.Numeric(20, 8), server_default="0"),
        sa.Column("winning_pool", sa.Numeric(20, 8), server_default="0"),
        sa.Column("validator_fund", sa.Numeric(20, 8), server_default="0"),
        sa.Column("treasury_fund", sa.Numeric(20, 8), server_default="0"),
        sa.Column("burn_amount", sa.Numeric(20, 8), server_default="0"),
        sa.Column("ai_fund", sa.Numeric(20, 8), server_default="0"),
        sa.Column("settled_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_settlement_match_id", "match_settlements", ["match_id"])

    # ── user_stakes ────────────────────────────────────────────────────
    op.create_table(
        "user_stakes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("match_id", sa.String(100), nullable=False),
        sa.Column("prediction", sa.String(10), nullable=False),
        sa.Column("stake_amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("currency", sa.String(10), server_default="VITCoin"),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("payout_amount", sa.Numeric(20, 8), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_stake_user_id", "user_stakes", ["user_id"])
    op.create_index("idx_stake_match_id", "user_stakes", ["match_id"])
    op.create_index("idx_stake_status", "user_stakes", ["status"])

    # ── module_training_jobs ───────────────────────────────────────────
    op.create_table(
        "module_training_jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), server_default="uploading"),
        sa.Column("league", sa.String(100), nullable=False),
        sa.Column("team_filter", sa.String(200), nullable=True),
        sa.Column("date_from", sa.Date, nullable=True),
        sa.Column("date_to", sa.Date, nullable=True),
        sa.Column("row_count", sa.Integer, nullable=True),
        sa.Column("column_profile", sa.JSON, nullable=True),
        sa.Column("quality_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("quality_breakdown", sa.JSON, nullable=True),
        sa.Column("generated_prompt", sa.Text, nullable=True),
        sa.Column("vitcoin_reward", sa.Numeric(20, 8), server_default="0"),
        sa.Column("vitcoin_earned", sa.Boolean, server_default="0"),
        sa.Column("model_accuracy", sa.Numeric(5, 2), nullable=True),
        sa.Column("improvement_suggestion", sa.Text, nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_module_tj_user_id", "module_training_jobs", ["user_id"])
    op.create_index("idx_module_tj_status", "module_training_jobs", ["status"])
    op.create_index("idx_module_tj_submitted_at", "module_training_jobs", ["submitted_at"])

    # ── module_training_guide_steps ────────────────────────────────────
    op.create_table(
        "module_training_guide_steps",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("module_training_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_number", sa.Integer, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("required_columns", sa.JSON, nullable=True),
        sa.Column("example_data", sa.JSON, nullable=True),
        sa.Column("tips", sa.JSON, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="1"),
    )
    op.create_index("idx_module_tgs_job_id", "module_training_guide_steps", ["job_id"])


def downgrade() -> None:
    op.drop_table("module_training_guide_steps")
    op.drop_table("module_training_jobs")
    op.drop_table("user_stakes")
    op.drop_table("match_settlements")
    op.drop_table("oracle_results")
    op.drop_table("consensus_predictions")
    op.drop_table("validator_predictions")
    op.drop_table("validator_profiles")
