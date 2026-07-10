from typing import Annotated

from api.app.auth import CurrentUserDep, require_permission
from api.app.database import get_session
from api.app.models import User, UserInvite
from api.app.routes.users.schemas import (
    CurrentUserRead,
    UserInviteCreate,
    UserInviteRead,
    UserRead,
    UserUpdate,
)
from api.app.routes.users.utils import build_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/users", tags=["users"])
SessionDep = Annotated[Session, Depends(get_session)]
AdminDep = Annotated[User, Depends(require_permission("users:manage"))]


@router.get("/me", response_model=CurrentUserRead)
def me(user: CurrentUserDep) -> CurrentUserRead:
    """Return the resolved local user and effective permissions."""
    return build_current_user(user)


@router.get("", response_model=list[UserRead])
def list_users(session: SessionDep, _admin: AdminDep) -> list[User]:
    """List users for administrator management."""
    return list(session.scalars(select(User).order_by(User.created_at)).all())


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int, payload: UserUpdate, session: SessionDep, admin: AdminDep
) -> User:
    """Update a user's role or active status."""
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    updates = payload.model_dump(exclude_unset=True)
    if user.id == admin.id and updates.get("is_active") is False:
        raise HTTPException(status.HTTP_409_CONFLICT, "You cannot disable yourself.")
    for key, value in updates.items():
        setattr(user, key, value)
    session.commit()
    session.refresh(user)
    return user


@router.get("/invites", response_model=list[UserInviteRead])
def list_invites(session: SessionDep, _admin: AdminDep) -> list[UserInvite]:
    """List pending invitations."""
    return list(
        session.scalars(
            select(UserInvite)
            .where(UserInvite.accepted_at.is_(None))
            .order_by(UserInvite.created_at.desc())
        ).all()
    )


@router.post(
    "/invites", response_model=UserInviteRead, status_code=status.HTTP_201_CREATED
)
def invite_user(
    payload: UserInviteCreate, session: SessionDep, admin: AdminDep
) -> UserInvite:
    """Create or replace a pending local invitation."""
    invite = session.scalar(select(UserInvite).where(UserInvite.email == payload.email))
    if invite is None:
        invite = UserInvite(**payload.model_dump(), invited_by_id=admin.id)
        session.add(invite)
    else:
        invite.role = payload.role
        invite.invited_by_id = admin.id
        invite.accepted_at = None
    session.commit()
    session.refresh(invite)
    return invite


@router.delete("/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invite(invite_id: int, session: SessionDep, _admin: AdminDep) -> None:
    """Revoke a pending invitation."""
    invite = session.get(UserInvite, invite_id)
    if invite is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found.")
    session.delete(invite)
    session.commit()
