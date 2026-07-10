"""Local identity resolution and role-based authorization dependencies."""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.app.database import get_session
from api.app.models import User, UserRole

SessionDep = Annotated[Session, Depends(get_session)]

ROLE_PERMISSIONS: dict[UserRole, frozenset[str]] = {
    UserRole.ADMIN: frozenset(
        {
            "settings:manage",
            "users:manage",
            "recipes:write",
            "inventory:write",
            "shopping:write",
            "imports:write",
            "scanner:write",
        }
    ),
    UserRole.EDITOR: frozenset(
        {
            "recipes:write",
            "inventory:write",
            "shopping:write",
            "imports:write",
            "scanner:write",
        }
    ),
    UserRole.VIEWER: frozenset(),
}


def permissions_for(role: UserRole) -> list[str]:
    """Return stable permissions granted to a role."""
    return sorted(ROLE_PERMISSIONS[role])


def get_current_user(
    session: SessionDep,
    x_kombu_user_id: Annotated[int | None, Header()] = None,
) -> User:
    """Resolve a local user, defaulting to the bootstrap administrator."""
    if x_kombu_user_id is not None:
        user = session.get(User, x_kombu_user_id)
    else:
        user = session.scalar(
            select(User).where(User.is_active.is_(True)).order_by(User.id)
        )
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid active Kombu user is required.",
        )
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def require_permission(permission: str) -> Callable[[CurrentUserDep], User]:
    """Build a dependency that rejects users without a permission."""

    def dependency(user: CurrentUserDep) -> User:
        """Authorize the resolved user against the requested permission."""
        if permission not in ROLE_PERMISSIONS[user.role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The '{permission}' permission is required.",
            )
        return user

    return dependency
