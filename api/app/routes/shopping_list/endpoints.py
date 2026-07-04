from typing import Annotated

from api.app.database import get_session
from api.app.models import ShoppingItemStatus
from api.app.routes.shopping_list.schemas import (
    ShoppingListItemCreate,
    ShoppingListItemRead,
    ShoppingListItemUpdate,
)
from api.app.routes.shopping_list.utils import (
    create_shopping_item,
    list_shopping_items,
    update_shopping_item,
)
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
