from typing import Annotated

from api.app.database import get_session
from api.app.routes.imports.schemas import (
    ImportJobCreate,
    ImportJobRead,
    ImportSourceRead,
)
from api.app.routes.imports.utils import (
    create_import_job,
    list_import_jobs,
    list_import_sources,
)
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/imports", tags=["imports"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/sources", response_model=list[ImportSourceRead])
def sources() -> list[ImportSourceRead]:
    """Return supported import source types."""
    return list_import_sources()


@router.get("/jobs", response_model=list[ImportJobRead])
def jobs(session: SessionDep) -> list[ImportJobRead]:
    """Return import jobs."""
    return [ImportJobRead.model_validate(job) for job in list_import_jobs(session)]


@router.post("/jobs", response_model=ImportJobRead, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: ImportJobCreate,
    session: SessionDep,
) -> ImportJobRead:
    """Create an import job."""
    job = create_import_job(session, payload)
    return ImportJobRead.model_validate(job)
