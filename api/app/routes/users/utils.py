from api.app.auth import permissions_for
from api.app.models import User
from api.app.routes.users.schemas import CurrentUserRead


def build_current_user(user: User) -> CurrentUserRead:
    """Build the current-user response without exposing account internals."""
    return CurrentUserRead(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        auth_provider="local",
        permissions=permissions_for(user.role),
    )
