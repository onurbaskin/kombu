from datetime import datetime

from api.app.models import UserRole
from pydantic import BaseModel, ConfigDict, Field


class CurrentUserRead(BaseModel):
    """Current user bootstrap response."""

    id: int
    email: str
    display_name: str
    role: str
    auth_provider: str
    permissions: list[str]
    model_config = ConfigDict(from_attributes=True)


class UserRead(BaseModel):
    """Administrator-facing user summary."""

    id: int
    email: str
    display_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    """Fields an administrator can change on a user."""

    role: UserRole | None = None
    is_active: bool | None = None


class UserInviteCreate(BaseModel):
    """Create a pending user invitation."""

    email: str = Field(min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+$")
    role: UserRole = UserRole.VIEWER


class UserInviteRead(BaseModel):
    """Pending invitation safe to display to administrators."""

    id: int
    email: str
    role: UserRole
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
