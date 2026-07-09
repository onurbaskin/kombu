import threading
from typing import Annotated

from api.app.database import SessionLocal, get_session
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


def _run_import_background(job_id: int) -> None:
    """Run a Kaggle dataset import in a background thread."""
    from api.app.services.recipe_importer import import_kaggle_dataset

    session = SessionLocal()
    try:
        import_kaggle_dataset(session, job_id)
    finally:
        session.close()


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
    """Create an import job and execute it in the background."""
    job = create_import_job(session, payload)
    if payload.source_type == "dataset":
        threading.Thread(
            target=_run_import_background,
            args=(job.id,),
            daemon=True,
        ).start()
    return ImportJobRead.model_validate(job)
