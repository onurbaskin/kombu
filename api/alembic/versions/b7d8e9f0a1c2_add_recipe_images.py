"""Add cached generated recipe images.

Revision ID: b7d8e9f0a1c2
Revises: 9c41f7a0d2e8
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b7d8e9f0a1c2"
down_revision: str | None = "9c41f7a0d2e8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the recipe image cache."""
    op.create_table(
        "recipe_images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=False),
        sa.Column("model", sa.String(length=160), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recipe_images_recipe_id", "recipe_images", ["recipe_id"])


def downgrade() -> None:
    """Remove the recipe image cache."""
    op.drop_index("ix_recipe_images_recipe_id", table_name="recipe_images")
    op.drop_table("recipe_images")
