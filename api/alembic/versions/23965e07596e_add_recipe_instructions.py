"""add_recipe_instructions

Revision ID: 23965e07596e
Revises: 0002_add_recipe_filter_indexes
Create Date: 2026-07-09 22:03:03.185230
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "23965e07596e"
down_revision: str | None = "0002_add_recipe_filter_indexes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("recipes", sa.Column("instructions", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("recipes", "instructions")
