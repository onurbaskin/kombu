from datetime import date, datetime

from api.app.models import InventoryLocation
from pydantic import BaseModel, ConfigDict, Field


class InventoryItemCreate(BaseModel):
    """Inventory item creation request."""

    name: str = Field(min_length=1, max_length=240)
    quantity: float = Field(default=1, ge=0)
    unit: str | None = Field(default=None, max_length=80)
    location: InventoryLocation = InventoryLocation.PANTRY
    expires_on: date | None = None
    opened_on: date | None = None
    source: str | None = Field(default=None, max_length=160)
    notes: str | None = None


class InventoryItemRead(InventoryItemCreate):
    """Inventory item response."""

    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InventoryPhotoImportRead(BaseModel):
    """Items created after analyzing uploaded inventory photos."""

    items: list[InventoryItemRead]
