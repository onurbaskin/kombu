"""Helpers for persisted feature flags and capability switches."""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.app.database import get_session
from api.app.models import AppSetting

SessionDep = Annotated[Session, Depends(get_session)]


def is_setting_enabled(session: Session, key: str, default: bool = False) -> bool:
    """Read a persisted boolean setting, falling back to its shipped default."""
    setting = session.get(AppSetting, key)
    if setting is None:
        return default
    return setting.value.casefold() == "true"


def set_setting_enabled(session: Session, key: str, enabled: bool) -> AppSetting:
    """Persist a boolean runtime setting."""
    setting = session.get(AppSetting, key)
    if setting is None:
        setting = AppSetting(key=key, value=str(enabled).lower())
        session.add(setting)
    else:
        setting.value = str(enabled).lower()
    session.commit()
    session.refresh(setting)
    return setting


def require_setting(key: str, default: bool = False) -> Callable[[SessionDep], None]:
    """Build a dependency that rejects requests for a disabled feature."""

    def dependency(session: SessionDep) -> None:
        """Check the persisted setting at the request boundary."""
        parent_enabled = not key.startswith("ai.") or is_setting_enabled(
            session, "feature.ai", False
        )
        if not parent_enabled or not is_setting_enabled(session, key, default):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The '{key}' feature is disabled.",
            )

    return dependency
