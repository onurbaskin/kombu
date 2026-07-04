"""Create initial Kombu schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the first set of Kombu application tables."""
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("auth_provider", sa.String(length=120), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(
        op.f("ix_organizations_slug"), "organizations", ["slug"], unique=False
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "recipes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("source_url", sa.String(length=1024), nullable=True),
        sa.Column("source_type", sa.String(length=40), nullable=False),
        sa.Column("cuisine", sa.String(length=120), nullable=True),
        sa.Column("yield_servings", sa.Integer(), nullable=True),
        sa.Column("prep_minutes", sa.Integer(), nullable=True),
        sa.Column("cook_minutes", sa.Integer(), nullable=True),
        sa.Column("is_favorite", sa.Boolean(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recipes_title"), "recipes", ["title"], unique=False)

    op.create_table(
        "inventory_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=80), nullable=True),
        sa.Column("location", sa.String(length=40), nullable=False),
        sa.Column("expires_on", sa.Date(), nullable=True),
        sa.Column("opened_on", sa.Date(), nullable=True),
        sa.Column("source", sa.String(length=160), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_inventory_items_expires_on"),
        "inventory_items",
        ["expires_on"],
        unique=False,
    )
    op.create_index(
        op.f("ix_inventory_items_location"),
        "inventory_items",
        ["location"],
        unique=False,
    )
    op.create_index(
        op.f("ix_inventory_items_name"), "inventory_items", ["name"], unique=False
    )

    op.create_table(
        "recipe_ingredients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(length=80), nullable=True),
        sa.Column("note", sa.String(length=240), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_recipe_ingredients_name"), "recipe_ingredients", ["name"], unique=False
    )

    op.create_table(
        "shopping_list_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=80), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("linked_inventory_item_id", sa.Integer(), nullable=True),
        sa.Column("recipe_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["linked_inventory_item_id"], ["inventory_items.id"]),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_shopping_list_items_name"),
        "shopping_list_items",
        ["name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_shopping_list_items_status"),
        "shopping_list_items",
        ["status"],
        unique=False,
    )

    op.create_table(
        "import_jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_name", sa.String(length=180), nullable=False),
        sa.Column("source_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("requested_by_id", sa.Integer(), nullable=True),
        sa.Column("total_records", sa.Integer(), nullable=False),
        sa.Column("imported_records", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_import_jobs_status"), "import_jobs", ["status"], unique=False
    )

    op.create_table(
        "scan_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("scan_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("device_hint", sa.String(length=160), nullable=True),
        sa.Column("raw_payload", sa.Text(), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_scan_sessions_status"), "scan_sessions", ["status"], unique=False
    )

    op.create_table(
        "ai_suggestions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("context", sa.Text(), nullable=True),
        sa.Column("suggestion", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Drop the initial Kombu application tables."""
    op.drop_table("ai_suggestions")
    op.drop_index(op.f("ix_scan_sessions_status"), table_name="scan_sessions")
    op.drop_table("scan_sessions")
    op.drop_index(op.f("ix_import_jobs_status"), table_name="import_jobs")
    op.drop_table("import_jobs")
    op.drop_index(
        op.f("ix_shopping_list_items_status"), table_name="shopping_list_items"
    )
    op.drop_index(op.f("ix_shopping_list_items_name"), table_name="shopping_list_items")
    op.drop_table("shopping_list_items")
    op.drop_index(op.f("ix_recipe_ingredients_name"), table_name="recipe_ingredients")
    op.drop_table("recipe_ingredients")
    op.drop_index(op.f("ix_inventory_items_name"), table_name="inventory_items")
    op.drop_index(op.f("ix_inventory_items_location"), table_name="inventory_items")
    op.drop_index(op.f("ix_inventory_items_expires_on"), table_name="inventory_items")
    op.drop_table("inventory_items")
    op.drop_index(op.f("ix_recipes_title"), table_name="recipes")
    op.drop_table("recipes")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    op.drop_index(op.f("ix_organizations_slug"), table_name="organizations")
    op.drop_table("organizations")
