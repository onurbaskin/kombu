from pydantic import BaseModel, ConfigDict


class CurrentUserRead(BaseModel):
    """Current user bootstrap response."""

    id: str
    email: str
    display_name: str
    role: str
    auth_provider: str
    permissions: list[str]
    model_config = ConfigDict(from_attributes=True)
