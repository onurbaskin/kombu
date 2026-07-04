from api.app.models import ShoppingItemStatus, ShoppingListItem
from api.app.routes.shopping_list.schemas import (
    ShoppingListItemCreate,
    ShoppingListItemUpdate,
)
from sqlalchemy import select
from sqlalchemy.orm import Session


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
