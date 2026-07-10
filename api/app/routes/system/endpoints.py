from typing import Annotated

from api.app.auth import require_permission
from api.app.config import Settings, get_settings
from api.app.database import get_session
from api.app.models import User
from api.app.routes.system.schemas import (
    FeatureFlag,
    FeatureFlagUpdate,
    ReadinessRead,
    SystemOverviewRead,
)
from api.app.routes.system.utils import build_features, build_overview, check_readiness
from api.app.runtime_settings import set_setting_enabled
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/system", tags=["system"])
SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
AdminDep = Annotated[User, Depends(require_permission("settings:manage"))]


@router.get("/overview", response_model=SystemOverviewRead)
def overview(
    session: SessionDep,
    settings: SettingsDep,
) -> SystemOverviewRead:
    """Return initial dashboard data for the frontend."""
    return build_overview(session, settings)


@router.get("/readiness", response_model=ReadinessRead)
def readiness(session: SessionDep) -> ReadinessRead:
    """Return readiness for dependency-aware checks."""
    return check_readiness(session)


@router.get("/features", response_model=list[FeatureFlag])
def features(session: SessionDep) -> list[FeatureFlag]:
    """Return persisted feature availability."""
    return build_features(session)


@router.patch("/features/{key}", response_model=FeatureFlag)
def update_feature(
    key: str, payload: FeatureFlagUpdate, session: SessionDep, _admin: AdminDep
) -> FeatureFlag:
    """Persist an administrator-controlled feature flag."""
    available = {feature.key: feature for feature in build_features(session)}
    if key not in available:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feature flag not found.")
    set_setting_enabled(session, f"feature.{key}", payload.enabled)
    return next(feature for feature in build_features(session) if feature.key == key)
