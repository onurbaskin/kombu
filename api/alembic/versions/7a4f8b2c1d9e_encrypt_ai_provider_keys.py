"""encrypt_ai_provider_keys

Revision ID: 7a4f8b2c1d9e
Revises: 305e0c3cd62a, de228ebe6a92
"""

import os
from collections.abc import Sequence

import sqlalchemy as sa
from cryptography.fernet import Fernet

from alembic import op

revision: str = "7a4f8b2c1d9e"
down_revision: str | tuple[str, str] | None = ("305e0c3cd62a", "de228ebe6a92")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ai_provider_configs", sa.Column("encrypted_api_key", sa.Text(), nullable=True)
    )
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, api_key FROM ai_provider_configs")).all()
    if rows:
        key = os.environ.get("KOMBU_ENCRYPTION_KEY", "")
        if not key:
            raise RuntimeError(
                "KOMBU_ENCRYPTION_KEY is required to migrate AI provider API keys."
            )
        try:
            fernet = Fernet(key.encode())
        except (TypeError, ValueError) as exc:
            raise RuntimeError(
                "KOMBU_ENCRYPTION_KEY must be a valid Fernet key."
            ) from exc
        for row in rows:
            encrypted = fernet.encrypt(row.api_key.encode()).decode()
            bind.execute(
                sa.text(
                    "UPDATE ai_provider_configs SET encrypted_api_key = :encrypted "
                    "WHERE id = :id"
                ),
                {"encrypted": encrypted, "id": row.id},
            )
    with op.batch_alter_table("ai_provider_configs") as batch_op:
        batch_op.drop_column("api_key")
        batch_op.alter_column("encrypted_api_key", nullable=False)


def downgrade() -> None:
    raise RuntimeError("Downgrading would reintroduce plaintext AI provider API keys.")
