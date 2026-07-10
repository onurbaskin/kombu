from datetime import datetime

from api.app.models import ShoppingItemStatus
from pydantic import BaseModel, ConfigDict, Field


class ShoppingListItemCreate(BaseModel):
    """Shopping list item creation request."""

    name: str = Field(min_length=1, max_length=240)
    quantity: float = Field(default=1, ge=0)
    unit: str | None = Field(default=None, max_length=80)
    category: str | None = Field(default=None, max_length=120)
    status: ShoppingItemStatus = ShoppingItemStatus.NEEDED
    linked_inventory_item_id: int | None = None
    recipe_id: int | None = None


class ShoppingListItemUpdate(BaseModel):
    """Partial shopping list item update request."""

    quantity: float | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=80)
    category: str | None = Field(default=None, max_length=120)
    status: ShoppingItemStatus | None = None


class ShoppingListItemRead(ShoppingListItemCreate):
    """Shopping list item response."""

    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ShoppingSuggestionRead(BaseModel):
    """One context-aware proposal for the next shopping run."""

    item_name: str
    reason: str
    priority: str = "medium"
    category: str = "Other"


class ShoppingSuggestionsRead(BaseModel):
    """Shopping proposals derived from the user's own kitchen activity."""

    suggestions: list[ShoppingSuggestionRead]
