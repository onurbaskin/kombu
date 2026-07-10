"""Add editable recipe versions.

Revision ID: c8e9f0a1b2d3
Revises: b7d8e9f0a1c2
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c8e9f0a1b2d3"
down_revision: str | None = "b7d8e9f0a1c2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the recipe version snapshot table."""
    op.create_table(
        "recipe_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("version_type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=2048), nullable=True),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("ingredients_json", sa.Text(), nullable=False),
        sa.Column("cuisine", sa.String(length=120), nullable=True),
        sa.Column("yield_servings", sa.Integer(), nullable=True),
        sa.Column("prep_minutes", sa.Integer(), nullable=True),
        sa.Column("cook_minutes", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recipe_versions_recipe_id", "recipe_versions", ["recipe_id"])


def downgrade() -> None:
    """Remove editable recipe versions."""
    op.drop_index("ix_recipe_versions_recipe_id", table_name="recipe_versions")
    op.drop_table("recipe_versions")
