from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.app.database import Base


class UserRole(StrEnum):
    """Supported user roles for the initial multi-user model."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class RecipeSourceType(StrEnum):
    """Where a recipe originated before it was stored in Kombu."""

    USER = "user"
    IMPORT = "import"
    WEB = "web"
    AI = "ai"


class InventoryLocation(StrEnum):
    """Common locations where inventory items can be stored."""

    PANTRY = "pantry"
    FRIDGE = "fridge"
    FREEZER = "freezer"
    COUNTER = "counter"
    OTHER = "other"


class ShoppingItemStatus(StrEnum):
    """Lifecycle states for a shopping list item."""

    NEEDED = "needed"
    PURCHASED = "purchased"


class ImportJobStatus(StrEnum):
    """Lifecycle states for recipe import jobs."""

    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ScanSessionStatus(StrEnum):
    """Lifecycle states for scanner capture sessions."""

    CREATED = "created"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Organization(Base):
    """Tenant boundary for households, teams, or company kitchens."""

    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    auth_provider: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    users: Mapped[list["User"]] = relationship(back_populates="organization")


class User(Base):
    """Application user prepared for local accounts and future SSO."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(160))
    role: Mapped[UserRole] = mapped_column(String(40), default=UserRole.OWNER)
    organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("organizations.id"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    organization: Mapped[Organization | None] = relationship(back_populates="users")


class Recipe(Base):
    """Stored recipe from a user, import, web source, or AI draft."""

    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(240), index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    source_type: Mapped[RecipeSourceType] = mapped_column(
        String(40),
        default=RecipeSourceType.USER,
    )
    cuisine: Mapped[str | None] = mapped_column(String(120), nullable=True)
    yield_servings: Mapped[int | None] = mapped_column(nullable=True)
    prep_minutes: Mapped[int | None] = mapped_column(nullable=True)
    cook_minutes: Mapped[int | None] = mapped_column(nullable=True)
    is_favorite: Mapped[bool] = mapped_column(default=False)
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    ingredients: Mapped[list["RecipeIngredient"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeIngredient.position",
    )


class RecipeIngredient(Base):
    """Ingredient line belonging to a recipe."""

    __tablename__ = "recipe_ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(240), index=True)
    quantity: Mapped[float | None] = mapped_column(nullable=True)
    unit: Mapped[str | None] = mapped_column(String(80), nullable=True)
    note: Mapped[str | None] = mapped_column(String(240), nullable=True)
    position: Mapped[int] = mapped_column(default=0)

    recipe: Mapped[Recipe] = relationship(back_populates="ingredients")


class InventoryItem(Base):
    """Pantry, fridge, freezer, or other stored kitchen item."""

    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(240), index=True)
    quantity: Mapped[float] = mapped_column(default=1)
    unit: Mapped[str | None] = mapped_column(String(80), nullable=True)
    location: Mapped[InventoryLocation] = mapped_column(
        String(40),
        default=InventoryLocation.PANTRY,
        index=True,
    )
    expires_on: Mapped[date | None] = mapped_column(nullable=True, index=True)
    opened_on: Mapped[date | None] = mapped_column(nullable=True)
    source: Mapped[str | None] = mapped_column(String(160), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class ShoppingListItem(Base):
    """Item that a user intends to buy."""

    __tablename__ = "shopping_list_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(240), index=True)
    quantity: Mapped[float] = mapped_column(default=1)
    unit: Mapped[str | None] = mapped_column(String(80), nullable=True)
    category: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[ShoppingItemStatus] = mapped_column(
        String(40),
        default=ShoppingItemStatus.NEEDED,
        index=True,
    )
    linked_inventory_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("inventory_items.id"),
        nullable=True,
    )
    recipe_id: Mapped[int | None] = mapped_column(
        ForeignKey("recipes.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class ImportJob(Base):
    """Queued recipe or inventory import request."""

    __tablename__ = "import_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_name: Mapped[str] = mapped_column(String(180))
    source_type: Mapped[str] = mapped_column(String(80))
    status: Mapped[ImportJobStatus] = mapped_column(
        String(40),
        default=ImportJobStatus.QUEUED,
        index=True,
    )
    requested_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    total_records: Mapped[int] = mapped_column(default=0)
    imported_records: Mapped[int] = mapped_column(default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class ScanSession(Base):
    """Camera, barcode, receipt, or dedicated scanner capture session."""

    __tablename__ = "scan_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    scan_type: Mapped[str] = mapped_column(String(80))
    status: Mapped[ScanSessionStatus] = mapped_column(
        String(40),
        default=ScanSessionStatus.CREATED,
        index=True,
    )
    device_hint: Mapped[str | None] = mapped_column(String(160), nullable=True)
    raw_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class AiSuggestion(Base):
    """Stored AI-ready suggestion without external provider credentials."""

    __tablename__ = "ai_suggestions"

    id: Mapped[int] = mapped_column(primary_key=True)
    prompt: Mapped[str] = mapped_column(Text)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggestion: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
