from datetime import date

from api.app.models import InventoryLocation
from pydantic import BaseModel


class ExpiryAlertRead(BaseModel):
    """Expiry alert response for an inventory item."""

    item_id: int
    name: str
    location: InventoryLocation
    expires_on: date
    days_until_expiry: int
    severity: str
