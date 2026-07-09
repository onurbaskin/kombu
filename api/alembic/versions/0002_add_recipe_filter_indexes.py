"""add recipe filter indexes

Revision ID: 0002_add_recipe_filter_indexes
Revises: 0001_initial_schema
Create Date: 2026-07-09
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002_add_recipe_filter_indexes"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_recipes_cuisine", "recipes", ["cuisine"])
    op.create_index("ix_recipes_source_type", "recipes", ["source_type"])


def downgrade() -> None:
    op.drop_index("ix_recipes_source_type", table_name="recipes")
    op.drop_index("ix_recipes_cuisine", table_name="recipes")
