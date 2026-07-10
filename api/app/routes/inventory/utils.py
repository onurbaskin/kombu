from api.app.models import InventoryItem, InventoryLocation
from api.app.routes.inventory.schemas import InventoryItemCreate
from sqlalchemy import select
from sqlalchemy.orm import Session


def list_inventory(
    session: Session,
    location: InventoryLocation | None = None,
) -> list[InventoryItem]:
    """List inventory items, optionally scoped to a location."""
    statement = select(InventoryItem).order_by(
        InventoryItem.expires_on, InventoryItem.name
    )
    if location is not None:
        statement = statement.where(InventoryItem.location == location)
    return list(session.scalars(statement).all())


def create_inventory_item(
    session: Session, payload: InventoryItemCreate
) -> InventoryItem:
    """Create an inventory item."""
    item = InventoryItem(**payload.model_dump())
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def create_inventory_items(
    session: Session, payloads: list[InventoryItemCreate]
) -> list[InventoryItem]:
    """Create multiple analyzed inventory items in one transaction."""
    items = [InventoryItem(**payload.model_dump()) for payload in payloads]
    session.add_all(items)
    session.commit()
    for item in items:
        session.refresh(item)
    return items
