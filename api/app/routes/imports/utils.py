from api.app.models import ImportJob
from api.app.routes.imports.schemas import ImportJobCreate, ImportSourceRead
from sqlalchemy import select
from sqlalchemy.orm import Session


def list_import_sources() -> list[ImportSourceRead]:
    """List import sources that Kombu can expose to users."""
    return [
        ImportSourceRead(
            key="kaggle-recipes",
            label="Kaggle recipe datasets",
            source_type="dataset",
            description=(
                "User-provided Kaggle exports prepared as repeatable import jobs."
            ),
            ready_for_import=False,
        ),
        ImportSourceRead(
            key="open-recipe-json",
            label="Open recipe JSON",
            source_type="json",
            description="Generic JSON recipe bundles with a documented mapping step.",
            ready_for_import=True,
        ),
        ImportSourceRead(
            key="csv-inventory",
            label="Inventory CSV",
            source_type="csv",
            description="Pantry, fridge, freezer, and shopping inventory CSV imports.",
            ready_for_import=True,
        ),
        ImportSourceRead(
            key="website-recipe",
            label="Website recipe capture",
            source_type="web",
            description=(
                "URL-based imports designed for future recipe extraction workers."
            ),
            ready_for_import=False,
        ),
    ]


def list_import_jobs(session: Session) -> list[ImportJob]:
    """List import jobs."""
    statement = select(ImportJob).order_by(ImportJob.created_at.desc())
    return list(session.scalars(statement).all())


def create_import_job(session: Session, payload: ImportJobCreate) -> ImportJob:
    """Create an import job placeholder."""
    job = ImportJob(**payload.model_dump())
    session.add(job)
    session.commit()
    session.refresh(job)
    return job
