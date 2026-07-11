from typing import Annotated

from api.app.database import get_session
from api.app.routes.health.schemas import HealthRead
from api.app.routes.health.utils import build_health_response
from api.app.routes.system.schemas import ReadinessRead
from api.app.routes.system.utils import check_readiness
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(tags=["health"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/healthz", response_model=HealthRead)
def healthz() -> HealthRead:
    """Return a lightweight liveness check."""
    return build_health_response()


@router.get("/readyz", response_model=ReadinessRead)
def readyz(session: SessionDep) -> ReadinessRead:
    """Return HTTP 503 until the configured database is reachable."""
    readiness = check_readiness(session)
    if readiness.status != "ok":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=readiness.model_dump(),
        )
    return readiness
