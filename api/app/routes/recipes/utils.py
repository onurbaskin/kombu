from api.app.models import Recipe, RecipeIngredient
from api.app.routes.recipes.schemas import RecipeCreate
from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload


def recipe_with_ingredients() -> Select[tuple[Recipe]]:
    """Build a recipe select that includes ingredient rows."""
    return select(Recipe).options(selectinload(Recipe.ingredients))


def list_recipes(session: Session, search: str | None = None) -> list[Recipe]:
    """List recipes, optionally filtering by title."""
    statement = recipe_with_ingredients().order_by(Recipe.updated_at.desc())
    if search:
        statement = statement.where(Recipe.title.ilike(f"%{search}%"))
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
