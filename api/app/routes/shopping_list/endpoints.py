from typing import Annotated

from api.app.database import get_session
from api.app.models import ShoppingItemStatus
from api.app.routes.shopping_list.schemas import (
    ShoppingListItemCreate,
    ShoppingListItemRead,
    ShoppingListItemUpdate,
    ShoppingSuggestionsRead,
)
from api.app.routes.shopping_list.utils import (
    build_shopping_suggestion_context,
    create_shopping_item,
    list_shopping_items,
    update_shopping_item,
)
from api.app.runtime_settings import require_setting
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/shopping-list", tags=["shopping-list"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=list[ShoppingListItemRead])
def index(
    session: SessionDep,
    status_filter: ShoppingItemStatus | None = None,
) -> list[ShoppingListItemRead]:
    """List shopping list items."""
    return [
        ShoppingListItemRead.model_validate(item)
        for item in list_shopping_items(session, status_filter)
    ]


@router.post(
    "", response_model=ShoppingListItemRead, status_code=status.HTTP_201_CREATED
)
def create(
    payload: ShoppingListItemCreate,
    session: SessionDep,
) -> ShoppingListItemRead:
    """Create a shopping list item."""
    item = create_shopping_item(session, payload)
    return ShoppingListItemRead.model_validate(item)


@router.patch("/{item_id}", response_model=ShoppingListItemRead)
def update(
    item_id: int,
    payload: ShoppingListItemUpdate,
    session: SessionDep,
) -> ShoppingListItemRead:
    """Update a shopping list item."""
    item = update_shopping_item(session, item_id, payload)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found."
        )
    return ShoppingListItemRead.model_validate(item)


@router.post(
    "/suggestions",
    response_model=ShoppingSuggestionsRead,
    dependencies=[Depends(require_setting("ai.shopping_suggestions"))],
)
async def suggestions(session: SessionDep) -> ShoppingSuggestionsRead:
    """Suggest useful items from stock, expiry, recipes, and previous runs."""
    from api.app.services.ai import suggest_shopping_items

    context = build_shopping_suggestion_context(session)
    try:
        result = await suggest_shopping_items(
            previous_shopping=context["shopping_history"],
            inventory_status=context["inventory_items"],
            planned_recipes=context["planned_recipes"],
            frequently_cooked=context["frequently_cooked"],
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(result["error"]),
        )
    return ShoppingSuggestionsRead.model_validate(result)
