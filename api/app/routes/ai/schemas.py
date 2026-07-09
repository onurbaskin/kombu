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


class KnownProviderRead(BaseModel):
    """A known AI provider type."""

    key: str
    label: str
    docs: str


class AiProviderConfigCreate(BaseModel):
    """Create a new AI provider configuration."""

    provider: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=160)
    api_key: str = Field(min_length=1, max_length=512)
    base_url: str | None = Field(default=None, max_length=1024)
    default_model: str = Field(min_length=1, max_length=160)
    is_enabled: bool = True


class AiProviderConfigUpdate(BaseModel):
    """Update an AI provider configuration."""

    label: str | None = Field(default=None, max_length=160)
    api_key: str | None = Field(default=None, max_length=512)
    base_url: str | None = Field(default=None, max_length=1024)
    default_model: str | None = Field(default=None, max_length=160)
    is_enabled: bool | None = None


class AiProviderConfigRead(BaseModel):
    """AI provider configuration response."""

    id: int
    provider: str
    label: str
    api_key: str
    base_url: str | None
    default_model: str
    is_enabled: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
