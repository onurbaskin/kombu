import json
import re
from collections import Counter
from datetime import date
from typing import Any

from api.app.models import (
    AiSuggestion,
    InventoryItem,
    Recipe,
    RecipeIngredient,
    RecipeSourceType,
    ShoppingListItem,
)
from api.app.routes.recipes.schemas import RecipeCreate, RecipeFilterValues
from sqlalchemy import Select, exists, func, select
from sqlalchemy.orm import Session, selectinload

_SORT_COLUMNS = {
    "updated_at": Recipe.updated_at,
    "created_at": Recipe.created_at,
    "title": Recipe.title,
    "cuisine": Recipe.cuisine,
    "prep_minutes": Recipe.prep_minutes,
    "cook_minutes": Recipe.cook_minutes,
}

_LEADING_INGREDIENT_AMOUNT = re.compile(
    r"^\s*(?:\d+(?:[./]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s+to\s+\d+(?:[./]\d+)?)?\s*",
    re.IGNORECASE,
)
_LEADING_INGREDIENT_UNIT = re.compile(
    r"^(?:(?:c\.|t\.|tsp|tbsp|teaspoons?|tablespoons?|cups?|ounces?|oz|pounds?|lbs?|"
    r"grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cloves?|cans?|packages?)"
    r"\.?\s+(?:of\s+)?)",
    re.IGNORECASE,
)


def normalize_ingredient_filter(name: str) -> str:
    """Turn a display ingredient line into a useful filter label."""
    normalized = _LEADING_INGREDIENT_AMOUNT.sub("", name.strip())
    normalized = _LEADING_INGREDIENT_UNIT.sub("", normalized)
    normalized = normalized.strip(" ,.-").casefold()
    return normalized[:80]


def recipe_with_ingredients() -> Select[tuple[Recipe]]:
    """Build a recipe select that includes ingredient rows."""
    return select(Recipe).options(selectinload(Recipe.ingredients))


def _apply_filters(
    statement: Select[Any],
    search: str | None = None,
    cuisine: str | None = None,
    source_type: str | None = None,
    ingredient: str | None = None,
    max_total_minutes: int | None = None,
    favorites_only: bool = False,
    has_image: bool | None = None,
) -> Select[Any]:
    """Apply recipe listing filters to a select statement."""
    if search:
        statement = statement.where(Recipe.title.ilike(f"%{search}%"))
    if cuisine:
        statement = statement.where(Recipe.cuisine == cuisine)
    if source_type:
        statement = statement.where(Recipe.source_type == source_type)
    if ingredient:
        statement = statement.where(
            exists().where(
                RecipeIngredient.recipe_id == Recipe.id,
                RecipeIngredient.name.ilike(f"%{ingredient}%"),
            )
        )
    if max_total_minutes is not None:
        statement = statement.where(
            func.coalesce(Recipe.prep_minutes, 0)
            + func.coalesce(Recipe.cook_minutes, 0)
            <= max_total_minutes
        )
    if favorites_only:
        statement = statement.where(Recipe.is_favorite.is_(True))
    if has_image is True:
        statement = statement.where(
            Recipe.image_url.isnot(None), Recipe.image_url != ""
        )
    elif has_image is False:
        statement = statement.where(
            (Recipe.image_url.is_(None)) | (Recipe.image_url == "")
        )
    return statement


def count_recipes(
    session: Session,
    search: str | None = None,
    cuisine: str | None = None,
    source_type: str | None = None,
    ingredient: str | None = None,
    max_total_minutes: int | None = None,
    favorites_only: bool = False,
    has_image: bool | None = None,
) -> int:
    """Return the total number of recipes matching the supplied filters."""
    statement = select(func.count(Recipe.id))
    statement = _apply_filters(
        statement,
        search=search,
        cuisine=cuisine,
        source_type=source_type,
        ingredient=ingredient,
        max_total_minutes=max_total_minutes,
        favorites_only=favorites_only,
        has_image=has_image,
    )
    return session.scalar(statement) or 0


def list_recipes(
    session: Session,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
    cuisine: str | None = None,
    source_type: str | None = None,
    ingredient: str | None = None,
    max_total_minutes: int | None = None,
    favorites_only: bool = False,
    has_image: bool | None = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
) -> list[Recipe]:
    """List recipes with optional filtering, sorting, and pagination."""
    statement = recipe_with_ingredients()
    statement = _apply_filters(
        statement,
        search=search,
        cuisine=cuisine,
        source_type=source_type,
        ingredient=ingredient,
        max_total_minutes=max_total_minutes,
        favorites_only=favorites_only,
        has_image=has_image,
    )
    sort_column = _SORT_COLUMNS.get(sort_by, Recipe.updated_at)
    if sort_order == "asc":
        statement = statement.order_by(sort_column.asc())
    else:
        statement = statement.order_by(sort_column.desc())
    statement = statement.offset(skip).limit(limit)
    return list(session.scalars(statement).unique().all())


def get_recipe(session: Session, recipe_id: int) -> Recipe | None:
    """Return one recipe by identifier."""
    statement = recipe_with_ingredients().where(Recipe.id == recipe_id)
    return session.scalars(statement).unique().one_or_none()


def create_recipe(session: Session, payload: RecipeCreate) -> Recipe:
    """Create a recipe and its ingredient lines."""
    recipe_data = payload.model_dump(exclude={"ingredients"})
    recipe = Recipe(**recipe_data)
    session.add(recipe)
    session.flush()

    for position, ingredient in enumerate(payload.ingredients):
        session.add(
            RecipeIngredient(
                recipe_id=recipe.id,
                position=position,
                **ingredient.model_dump(),
            ),
        )

    session.commit()
    stored_recipe = get_recipe(session, recipe.id)
    if stored_recipe is None:
        msg = "Recipe was not found after creation."
        raise RuntimeError(msg)
    return stored_recipe


def get_filter_values(session: Session) -> RecipeFilterValues:
    """Return distinct filter values for the recipe listing sidebar."""
    cuisine_rows = session.scalars(
        select(Recipe.cuisine).where(Recipe.cuisine.isnot(None)).distinct()
    ).all()
    cuisines = sorted(cuisine_rows)

    source_types = [st.value for st in RecipeSourceType]

    ingredient_rows = session.execute(
        select(RecipeIngredient.name, func.count(RecipeIngredient.id).label("uses"))
        .group_by(RecipeIngredient.name)
        .order_by(func.count(RecipeIngredient.id).desc(), RecipeIngredient.name.asc())
        .limit(500)
    ).all()
    ingredient_counts: Counter[str] = Counter()
    for name, uses in ingredient_rows:
        normalized = normalize_ingredient_filter(name)
        if len(normalized) > 1:
            ingredient_counts[normalized] += uses
    ingredients = [name for name, _uses in ingredient_counts.most_common(50)]

    max_prep = session.scalar(select(func.max(Recipe.prep_minutes)))
    max_cook = session.scalar(select(func.max(Recipe.cook_minutes)))

    return RecipeFilterValues(
        cuisines=cuisines,
        source_types=source_types,
        ingredients=ingredients,
        max_prep_minutes=max_prep,
        max_cook_minutes=max_cook,
    )


def latest_recipe_enhancement(session: Session, recipe_id: int) -> AiSuggestion | None:
    """Return the newest cached enhancement for a recipe."""
    cache_key = f"recipe:{recipe_id}:enhancement"
    statement = (
        select(AiSuggestion)
        .where(AiSuggestion.context == cache_key)
        .order_by(AiSuggestion.created_at.desc(), AiSuggestion.id.desc())
        .limit(1)
    )
    return session.scalars(statement).first()


def cache_recipe_enhancement(
    session: Session, recipe_id: int, suggestion: dict[str, Any]
) -> AiSuggestion:
    """Persist an AI enhancement so repeat views do not call the provider."""
    record = AiSuggestion(
        prompt="Enhance and structure this recipe.",
        context=f"recipe:{recipe_id}:enhancement",
        suggestion=json.dumps(suggestion),
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def inventory_context(
    session: Session,
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """Return current and expiring inventory context for recipe assistance."""
    items = list(session.scalars(select(InventoryItem).order_by(InventoryItem.name)))
    inventory = [
        {"name": item.name, "quantity": str(item.quantity), "unit": item.unit or ""}
        for item in items
        if item.quantity > 0
    ]
    today = date.today()
    expiring = [
        {"name": item.name, "expires_on": item.expires_on.isoformat()}
        for item in items
        if item.quantity > 0
        and item.expires_on is not None
        and item.expires_on >= today
    ]
    return inventory, expiring


_PANTRY_MICRO_UNITS = {
    "pinch",
    "dash",
    "teaspoon",
    "teaspoons",
    "tsp",
    "tablespoon",
    "tablespoons",
    "tbsp",
}
_PANTRY_STAPLES = {"salt", "pepper", "oil", "water", "sugar"}


def add_missing_recipe_items(session: Session, recipe: Recipe) -> dict[str, list[str]]:
    """Add sensible missing ingredients while avoiding tiny pantry quantities."""
    inventory_names = {
        item.casefold()
        for item in session.scalars(
            select(InventoryItem.name).where(InventoryItem.quantity > 0)
        )
    }
    existing = {
        item.casefold()
        for item in session.scalars(
            select(ShoppingListItem.name).where(ShoppingListItem.status == "needed")
        )
    }
    result: dict[str, list[str]] = {
        "added": [],
        "skipped_available": [],
        "skipped_household_quantity": [],
    }
    for ingredient in recipe.ingredients:
        normalized = ingredient.name.casefold().strip()
        if normalized in inventory_names or normalized in existing:
            result["skipped_available"].append(ingredient.name)
            continue
        unit = (ingredient.unit or "").casefold().strip()
        is_micro = unit in _PANTRY_MICRO_UNITS or (
            ingredient.quantity is not None and ingredient.quantity <= 0.5
        )
        words = set(re.findall(r"[a-z]+", normalized))
        if is_micro and words & _PANTRY_STAPLES:
            result["skipped_household_quantity"].append(ingredient.name)
            continue
        session.add(
            ShoppingListItem(
                name=ingredient.name,
                quantity=max(ingredient.quantity or 1, 1),
                unit=None if unit in _PANTRY_MICRO_UNITS else ingredient.unit,
                category="Recipe ingredients",
                recipe_id=recipe.id,
            )
        )
        existing.add(normalized)
        result["added"].append(ingredient.name)
    session.commit()
    return result
