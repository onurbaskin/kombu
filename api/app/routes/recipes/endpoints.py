from typing import Annotated

from api.app.database import get_session
from api.app.routes.recipes.schemas import (
    RecipeCreate,
    RecipeFilterValues,
    RecipeListResponse,
    RecipeRead,
)
from api.app.routes.recipes.utils import (
    count_recipes,
    create_recipe,
    get_filter_values,
    get_recipe,
    list_recipes,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/recipes", tags=["recipes"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=RecipeListResponse)
def index(
    session: SessionDep,
    search: str | None = Query(default=None, min_length=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    cuisine: str | None = Query(default=None),
    source_type: str | None = Query(default=None),
    sort_by: str = Query(default="updated_at"),
    sort_order: str = Query(default="desc"),
) -> RecipeListResponse:
    """List recipes stored in Kombu with filtering, sorting, and pagination."""
    total = count_recipes(
        session,
        search=search,
        cuisine=cuisine,
        source_type=source_type,
    )
    items = [
        RecipeRead.model_validate(recipe)
        for recipe in list_recipes(
            session,
            search=search,
            skip=skip,
            limit=limit,
            cuisine=cuisine,
            source_type=source_type,
            sort_by=sort_by,
            sort_order=sort_order,
        )
    ]
    return RecipeListResponse(
        items=items,
        total=total,
        page=skip // limit + 1 if limit else 1,
        per_page=limit,
    )


@router.post("", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
def create(payload: RecipeCreate, session: SessionDep) -> RecipeRead:
    """Create a recipe."""
    recipe = create_recipe(session, payload)
    return RecipeRead.model_validate(recipe)


@router.get("/filters", response_model=RecipeFilterValues)
def filter_values(session: SessionDep) -> RecipeFilterValues:
    """Return distinct filter values for the recipe listing."""
    return get_filter_values(session)


@router.get("/{recipe_id}", response_model=RecipeRead)
def show(recipe_id: int, session: SessionDep) -> RecipeRead:
    """Return one recipe."""
    recipe = get_recipe(session, recipe_id)
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found."
        )
    return RecipeRead.model_validate(recipe)
