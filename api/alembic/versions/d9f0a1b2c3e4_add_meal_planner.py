"""Add recurring meal planner schedules.

Revision ID: d9f0a1b2c3e4
Revises: c8e9f0a1b2d3
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d9f0a1b2c3e4"
down_revision: str | None = "c8e9f0a1b2d3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create meal plan series and materialized occurrences."""
    op.create_table(
        "meal_plan_series",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.String(length=5), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("repeat_frequency", sa.String(length=20), nullable=False),
        sa.Column("repeat_interval", sa.Integer(), nullable=False),
        sa.Column("repeat_count", sa.Integer(), nullable=True),
        sa.Column("repeat_until", sa.Date(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_meal_plan_series_start_date", "meal_plan_series", ["start_date"]
    )
    op.create_table(
        "meal_plan_occurrences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("series_id", sa.Integer(), nullable=False),
        sa.Column("occurrence_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.String(length=5), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["series_id"], ["meal_plan_series.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_meal_plan_occurrences_series_id", "meal_plan_occurrences", ["series_id"]
    )
    op.create_index(
        "ix_meal_plan_occurrences_occurrence_date",
        "meal_plan_occurrences",
        ["occurrence_date"],
    )


def downgrade() -> None:
    """Remove meal planner schedules."""
    op.drop_index(
        "ix_meal_plan_occurrences_occurrence_date",
        table_name="meal_plan_occurrences",
    )
    op.drop_index(
        "ix_meal_plan_occurrences_series_id", table_name="meal_plan_occurrences"
    )
    op.drop_table("meal_plan_occurrences")
    op.drop_index("ix_meal_plan_series_start_date", table_name="meal_plan_series")
    op.drop_table("meal_plan_series")
