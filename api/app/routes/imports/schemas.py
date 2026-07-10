from datetime import datetime

from api.app.models import ImportJobStatus
from pydantic import BaseModel, ConfigDict, Field


class ImportSourceRead(BaseModel):
    """Import source that Kombu can prepare for users."""

    key: str
    label: str
    source_type: str
    description: str
    ready_for_import: bool


class ImportCredentialUpdate(BaseModel):
    """User-supplied account and secret for a maintainer-defined source."""

    account_name: str = Field(min_length=1, max_length=320)
    secret: str = Field(min_length=1, max_length=512)


class ImportCredentialRead(BaseModel):
    """Credential status that never exposes stored secret material."""

    source_key: str
    account_name: str | None
    configured: bool


class ImportJobCreate(BaseModel):
    """Import job creation request."""

    source_name: str = Field(min_length=1, max_length=180)
    source_type: str = Field(min_length=1, max_length=80)


class ImportJobRead(BaseModel):
    """Import job response."""

    id: int
    source_name: str
    source_type: str
    status: ImportJobStatus
    total_records: int
    imported_records: int
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None
    model_config = ConfigDict(from_attributes=True)
