from datetime import date
from typing import TypedDict

from api.app.models import (
    InventoryItem,
    InventoryLocation,
    MealPlanOccurrence,
    MealPlanSeries,
    Recipe,
    ShoppingItemStatus,
    ShoppingListItem,
)
from api.app.routes.meal_plans.schemas import PlannedShoppingItemRead
from api.app.routes.shopping_list.schemas import (
    ShoppingListItemCreate,
    ShoppingListItemUpdate,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload


class ShoppingSuggestionContext(TypedDict):
    """Database-derived context passed to the shopping suggestion service."""

    shopping_history: list[dict[str, str]]
    inventory_items: list[dict[str, str]]
    planned_recipes: list[dict[str, str]]
    frequently_cooked: list[str]


class PlannedShoppingGroup(TypedDict):
    """Typed accumulator for meal-plan ingredient demand."""

    name: str
    quantity: float
    unit: str | None
    occurrence_count: int
    recipe_titles: set[str]
    first_needed_on: date


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

    was_purchased = item.status == ShoppingItemStatus.PURCHASED
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field_name, value)
    if not was_purchased and item.status == ShoppingItemStatus.PURCHASED:
        receive_purchased_item(session, item)
    session.commit()
    session.refresh(item)
    return item


def receive_purchased_item(session: Session, item: ShoppingListItem) -> InventoryItem:
    """Upsert a purchased item into pantry inventory exactly once per transition."""
    existing = session.scalar(
        select(InventoryItem).where(
            func.lower(InventoryItem.name) == item.name.casefold(),
            InventoryItem.unit == item.unit,
            InventoryItem.location == InventoryLocation.PANTRY,
        )
    )
    if existing is None:
        existing = InventoryItem(
            name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            location=InventoryLocation.PANTRY,
            source="shopping-list",
        )
        session.add(existing)
        session.flush()
    else:
        existing.quantity += item.quantity
        existing.source = "shopping-list"
    item.linked_inventory_item_id = existing.id
    return existing


def list_planned_shopping(
    session: Session, start_date: date, end_date: date
) -> list[PlannedShoppingItemRead]:
    """Aggregate ingredients required by meals scheduled in a date window."""
    occurrences = session.scalars(
        select(MealPlanOccurrence)
        .join(MealPlanSeries)
        .options(
            selectinload(MealPlanOccurrence.series)
            .selectinload(MealPlanSeries.recipe)
            .selectinload(Recipe.ingredients)
        )
        .where(
            MealPlanOccurrence.occurrence_date >= start_date,
            MealPlanOccurrence.occurrence_date <= end_date,
        )
    ).all()
    existing_names = {
        name.casefold()
        for name in session.scalars(
            select(ShoppingListItem.name).where(
                ShoppingListItem.status == ShoppingItemStatus.NEEDED
            )
        ).all()
    }
    grouped: dict[tuple[str, str], PlannedShoppingGroup] = {}
    for occurrence in occurrences:
        recipe = occurrence.series.recipe
        for ingredient in recipe.ingredients:
            unit = ingredient.unit or ""
            key = (ingredient.name.casefold(), unit.casefold())
            group = grouped.setdefault(
                key,
                {
                    "name": ingredient.name,
                    "quantity": 0.0,
                    "unit": ingredient.unit,
                    "occurrence_count": 0,
                    "recipe_titles": set(),
                    "first_needed_on": occurrence.occurrence_date,
                },
            )
            group["quantity"] += ingredient.quantity or 1
            group["occurrence_count"] += 1
            group["recipe_titles"].add(recipe.title)
            group["first_needed_on"] = min(
                group["first_needed_on"], occurrence.occurrence_date
            )
    return [
        PlannedShoppingItemRead(
            name=group["name"],
            quantity=group["quantity"],
            unit=group["unit"],
            occurrence_count=group["occurrence_count"],
            recipe_titles=sorted(group["recipe_titles"]),
            first_needed_on=group["first_needed_on"],
            already_needed=group["name"].casefold() in existing_names,
        )
        for group in sorted(
            grouped.values(),
            key=lambda value: (value["first_needed_on"], value["name"]),
        )
    ]


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
