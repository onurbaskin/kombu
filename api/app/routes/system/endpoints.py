from typing import Annotated

from api.app.config import Settings, get_settings
from api.app.database import get_session
from api.app.routes.system.schemas import ReadinessRead, SystemOverviewRead
from api.app.routes.system.utils import build_overview, check_readiness
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/system", tags=["system"])
SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


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
