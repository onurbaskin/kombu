from datetime import datetime

from api.app.models import ScanSessionStatus
from pydantic import BaseModel, ConfigDict, Field


class ScannerCapabilityRead(BaseModel):
    """Scanner capability response."""

    key: str
    label: str
    description: str
    requires_hardware: bool


class ScanSessionCreate(BaseModel):
    """Scan session creation request."""

    scan_type: str = Field(min_length=1, max_length=80)
    device_hint: str | None = Field(default=None, max_length=160)
    raw_payload: str | None = None


class ScanSessionRead(BaseModel):
    """Scan session response."""

    id: int
    scan_type: str
    status: ScanSessionStatus
    device_hint: str | None
    raw_payload: str | None
    result_summary: str | None
    created_at: datetime
    completed_at: datetime | None
    model_config = ConfigDict(from_attributes=True)
