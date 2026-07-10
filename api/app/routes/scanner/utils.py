from api.app.models import ScanSession
from api.app.routes.scanner.schemas import ScannerCapabilityRead, ScanSessionCreate
from sqlalchemy import select
from sqlalchemy.orm import Session


def list_scanner_capabilities() -> list[ScannerCapabilityRead]:
    """List scanner workflows supported by the API contract."""
    return [
        ScannerCapabilityRead(
            key="camera",
            label="Camera capture",
            description=(
                "Phone, tablet, or laptop camera capture for receipts and labels."
            ),
            requires_hardware=False,
        ),
        ScannerCapabilityRead(
            key="barcode",
            label="Barcode scanning",
            description=(
                "Barcode capture designed for camera or USB/Bluetooth scanners."
            ),
            requires_hardware=False,
        ),
    ]


def list_scan_sessions(session: Session) -> list[ScanSession]:
    """List scanner sessions."""
    statement = select(ScanSession).order_by(ScanSession.created_at.desc())
    return list(session.scalars(statement).all())


def create_scan_session(session: Session, payload: ScanSessionCreate) -> ScanSession:
    """Create a scanner session placeholder."""
    scan_session = ScanSession(**payload.model_dump())
    session.add(scan_session)
    session.commit()
    session.refresh(scan_session)
    return scan_session
