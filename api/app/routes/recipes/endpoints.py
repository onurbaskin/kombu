from typing import Annotated

from api.app.database import get_session
from api.app.routes.recipes.schemas import RecipeCreate, RecipeRead
from api.app.routes.recipes.utils import create_recipe, get_recipe, list_recipes
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/recipes", tags=["recipes"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=list[RecipeRead])
def index(
    session: SessionDep,
    search: str | None = Query(default=None, min_length=1),
) -> list[RecipeRead]:
    """List recipes stored in Kombu."""
    return [
        RecipeRead.model_validate(recipe) for recipe in list_recipes(session, search)
    ]


@router.post("", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
def create(payload: RecipeCreate, session: SessionDep) -> RecipeRead:
    """Create a recipe."""
    recipe = create_recipe(session, payload)
    return RecipeRead.model_validate(recipe)


@router.get("/{recipe_id}", response_model=RecipeRead)
def show(recipe_id: int, session: SessionDep) -> RecipeRead:
    """Return one recipe."""
    recipe = get_recipe(session, recipe_id)
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found."
        )
    return RecipeRead.model_validate(recipe)
