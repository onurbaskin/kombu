from typing import Annotated

from api.app.database import get_session
from api.app.routes.scanner.schemas import (
    ScannerCapabilityRead,
    ScanSessionCreate,
    ScanSessionRead,
)
from api.app.routes.scanner.utils import (
    create_scan_session,
    list_scan_sessions,
    list_scanner_capabilities,
)
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/scanner", tags=["scanner"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/capabilities", response_model=list[ScannerCapabilityRead])
def capabilities() -> list[ScannerCapabilityRead]:
    """Return supported scanner workflows."""
    return list_scanner_capabilities()


@router.get("/sessions", response_model=list[ScanSessionRead])
def sessions(session: SessionDep) -> list[ScanSessionRead]:
    """Return scanner sessions."""
    return [
        ScanSessionRead.model_validate(scan_session)
        for scan_session in list_scan_sessions(session)
    ]


@router.post(
    "/sessions", response_model=ScanSessionRead, status_code=status.HTTP_201_CREATED
)
def create_session(
    payload: ScanSessionCreate,
    session: SessionDep,
) -> ScanSessionRead:
    """Create a scanner session."""
    scan_session = create_scan_session(session, payload)
    return ScanSessionRead.model_validate(scan_session)
