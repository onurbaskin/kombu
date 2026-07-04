from typing import Annotated

from api.app.database import get_session
from api.app.routes.alerts.schemas import ExpiryAlertRead
from api.app.routes.alerts.utils import list_expiry_alerts
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/alerts", tags=["alerts"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/expiry", response_model=list[ExpiryAlertRead])
def expiry(
    session: SessionDep,
    days: int = Query(default=7, ge=0, le=365),
) -> list[ExpiryAlertRead]:
    """Return inventory expiry alerts."""
    return list_expiry_alerts(session, days)
