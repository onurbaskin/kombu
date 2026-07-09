from typing import Any

from api.app.models import Recipe, RecipeIngredient, RecipeSourceType
from api.app.routes.recipes.schemas import RecipeCreate, RecipeFilterValues
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

_SORT_COLUMNS = {
    "updated_at": Recipe.updated_at,
    "created_at": Recipe.created_at,
    "title": Recipe.title,
    "cuisine": Recipe.cuisine,
    "prep_minutes": Recipe.prep_minutes,
    "cook_minutes": Recipe.cook_minutes,
}


def recipe_with_ingredients() -> Select[tuple[Recipe]]:
    """Build a recipe select that includes ingredient rows."""
    return select(Recipe).options(selectinload(Recipe.ingredients))


def _apply_filters(
    statement: Select[Any],
    search: str | None = None,
    cuisine: str | None = None,
    source_type: str | None = None,
) -> Select[Any]:
    if search:
        statement = statement.where(Recipe.title.ilike(f"%{search}%"))
    if cuisine:
        statement = statement.where(Recipe.cuisine == cuisine)
    if source_type:
        statement = statement.where(Recipe.source_type == source_type)
    return statement


def count_recipes(
    session: Session,
    search: str | None = None,
    cuisine: str | None = None,
    source_type: str | None = None,
) -> int:
    """Return the total number of recipes matching the supplied filters."""
    statement = select(func.count(Recipe.id))
    statement = _apply_filters(
        statement, search=search, cuisine=cuisine, source_type=source_type
    )
    return session.scalar(statement) or 0


def list_recipes(
    session: Session,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
    cuisine: str | None = None,
    source_type: str | None = None,
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

    max_prep = session.scalar(select(func.max(Recipe.prep_minutes)))
    max_cook = session.scalar(select(func.max(Recipe.cook_minutes)))

    return RecipeFilterValues(
        cuisines=cuisines,
        source_types=source_types,
        max_prep_minutes=max_prep,
        max_cook_minutes=max_cook,
    )
