from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AiCapabilityRead(BaseModel):
    """AI capability exposed without vendor-specific credentials."""

    key: str
    label: str
    enabled: bool
    description: str


class AiSuggestionCreate(BaseModel):
    """AI suggestion request."""

    prompt: str = Field(min_length=1)
    context: str | None = None


class AiSuggestionRead(BaseModel):
    """AI suggestion response."""

    id: int
    prompt: str
    context: str | None
    suggestion: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
