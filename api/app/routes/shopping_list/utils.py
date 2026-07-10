from datetime import date
from typing import TypedDict

from api.app.models import (
    InventoryItem,
    Recipe,
    ShoppingItemStatus,
    ShoppingListItem,
)
from api.app.routes.shopping_list.schemas import (
    ShoppingListItemCreate,
    ShoppingListItemUpdate,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session


class ShoppingSuggestionContext(TypedDict):
    """Database-derived context passed to the shopping suggestion service."""

    shopping_history: list[dict[str, str]]
    inventory_items: list[dict[str, str]]
    planned_recipes: list[dict[str, str]]
    frequently_cooked: list[str]


def list_shopping_items(
    session: Session,
    status: ShoppingItemStatus | None = None,
) -> list[ShoppingListItem]:
    """List shopping items, optionally filtered by status."""
    statement = select(ShoppingListItem).order_by(
        ShoppingListItem.status, ShoppingListItem.name
    )
    if status is not None:
        statement = statement.where(ShoppingListItem.status == status)
    return list(session.scalars(statement).all())


def create_shopping_item(
    session: Session,
    payload: ShoppingListItemCreate,
) -> ShoppingListItem:
    """Create a shopping list item."""
    item = ShoppingListItem(**payload.model_dump())
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def update_shopping_item(
    session: Session,
    item_id: int,
    payload: ShoppingListItemUpdate,
) -> ShoppingListItem | None:
    """Update a shopping list item."""
    item = session.get(ShoppingListItem, item_id)
    if item is None:
        return None

    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field_name, value)
    session.commit()
    session.refresh(item)
    return item


def build_shopping_suggestion_context(session: Session) -> ShoppingSuggestionContext:
    """Derive suggestion context from real inventory and shopping activity."""
    purchased = list(
        session.scalars(
            select(ShoppingListItem)
            .where(ShoppingListItem.status == ShoppingItemStatus.PURCHASED)
            .order_by(ShoppingListItem.updated_at.desc())
            .limit(100)
        ).all()
    )
    inventory = list(
        session.scalars(
            select(InventoryItem).order_by(InventoryItem.updated_at.desc())
        ).all()
    )
    planned_recipe_ids = list(
        session.scalars(
            select(ShoppingListItem.recipe_id)
            .where(
                ShoppingListItem.status == ShoppingItemStatus.NEEDED,
                ShoppingListItem.recipe_id.is_not(None),
            )
            .distinct()
        ).all()
    )
    planned_recipes = (
        list(session.scalars(select(Recipe).where(Recipe.id.in_(planned_recipe_ids))))
        if planned_recipe_ids
        else []
    )
    frequent_titles = list(
        session.scalars(
            select(Recipe.title)
            .join(ShoppingListItem, ShoppingListItem.recipe_id == Recipe.id)
            .where(ShoppingListItem.status == ShoppingItemStatus.PURCHASED)
            .group_by(Recipe.id, Recipe.title)
            .order_by(func.count(ShoppingListItem.id).desc())
            .limit(10)
        ).all()
    )

    return {
        "shopping_history": [
            {
                "name": item.name,
                "quantity": str(item.quantity),
                "unit": item.unit or "",
                "category": item.category or "Other",
                "purchased_at": item.updated_at.isoformat(),
            }
            for item in purchased
        ],
        "inventory_items": [
            {
                "name": item.name,
                "quantity": str(item.quantity),
                "unit": item.unit or "",
                "location": str(item.location),
                "expires_on": item.expires_on.isoformat() if item.expires_on else "",
                "expiry_state": (
                    "expired"
                    if item.expires_on and item.expires_on < date.today()
                    else "expiring-soon"
                    if item.expires_on and (item.expires_on - date.today()).days <= 7
                    else "current"
                ),
                "last_updated": item.updated_at.isoformat(),
            }
            for item in inventory
        ],
        "planned_recipes": [
            {"title": recipe.title, "summary": recipe.summary or ""}
            for recipe in planned_recipes
        ],
        "frequently_cooked": frequent_titles,
    }
