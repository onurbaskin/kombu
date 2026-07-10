"""Add access management and persisted runtime settings.

Revision ID: 9c41f7a0d2e8
Revises: 7a4f8b2c1d9e
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "9c41f7a0d2e8"
down_revision: str | None = "7a4f8b2c1d9e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create persisted settings, invitations, and integration credentials."""
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_active", sa.Boolean(), nullable=False, server_default=sa.true()
            )
        )

    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_table(
        "user_invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("invited_by_id", sa.Integer(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["invited_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_invites_email", "user_invites", ["email"], unique=True)
    op.create_table(
        "integration_credentials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("integration_key", sa.String(length=120), nullable=False),
        sa.Column("encrypted_secret", sa.Text(), nullable=False),
        sa.Column("account_name", sa.String(length=320), nullable=True),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_integration_credentials_integration_key",
        "integration_credentials",
        ["integration_key"],
        unique=True,
    )

    # Existing installations used owner/member. Preserve privilege intent.
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'owner'")
    op.execute("UPDATE users SET role = 'editor' WHERE role = 'member'")
    op.execute(
        "INSERT INTO users (email, display_name, role, is_active) "
        "SELECT 'admin@example.invalid', 'Local Administrator', 'admin', 1 "
        "WHERE NOT EXISTS (SELECT 1 FROM users)"
    )


def downgrade() -> None:
    """Remove persisted settings and access management data."""
    op.drop_index(
        "ix_integration_credentials_integration_key",
        table_name="integration_credentials",
    )
    op.drop_table("integration_credentials")
    op.drop_index("ix_user_invites_email", table_name="user_invites")
    op.drop_table("user_invites")
    op.drop_table("app_settings")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("is_active")
