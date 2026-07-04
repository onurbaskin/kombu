from typing import Annotated

from api.app.database import get_session
from api.app.models import InventoryLocation
from api.app.routes.inventory.schemas import InventoryItemCreate, InventoryItemRead
from api.app.routes.inventory.utils import create_inventory_item, list_inventory
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/inventory", tags=["inventory"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=list[InventoryItemRead])
def index(
    session: SessionDep,
    location: InventoryLocation | None = None,
) -> list[InventoryItemRead]:
    """List tracked inventory items."""
    return [
        InventoryItemRead.model_validate(item)
        for item in list_inventory(session, location)
    ]


@router.post("", response_model=InventoryItemRead, status_code=201)
def create(
    payload: InventoryItemCreate,
    session: SessionDep,
) -> InventoryItemRead:
    """Create a tracked inventory item."""
    item = create_inventory_item(session, payload)
    return InventoryItemRead.model_validate(item)
