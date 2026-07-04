from api.app.routes.users.schemas import CurrentUserRead
from api.app.routes.users.utils import build_current_user
from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=CurrentUserRead)
def me() -> CurrentUserRead:
    """Return the current user placeholder until auth is configured."""
    return build_current_user()
