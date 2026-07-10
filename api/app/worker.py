"""Durable background worker for jobs created by the API."""

import logging
import time
from typing import Protocol
from uuid import uuid4

import redis
from sqlalchemy import select

from api.app.config import get_settings
from api.app.database import SessionLocal
from api.app.models import ImportJob, ImportJobStatus

logger = logging.getLogger(__name__)


class CacheLock(Protocol):
    """Minimal cache interface required for distributed worker claiming."""

    def set(self, key: str, value: str, *, nx: bool, ex: int) -> bool: ...

    def delete(self, key: str) -> None: ...


def claim_next_import(cache: CacheLock | None = None) -> int | None:
    """Claim the oldest queued import for this worker process."""
    lock_token = str(uuid4())
    if cache is not None and not cache.set(
        "kombu:worker:import-lock", lock_token, nx=True, ex=30
    ):
        return None

    with SessionLocal() as session:
        try:
            job = session.scalar(
                select(ImportJob)
                .where(ImportJob.status == ImportJobStatus.QUEUED)
                .order_by(ImportJob.created_at, ImportJob.id)
                .limit(1)
            )
            if job is None:
                return None

            job.status = ImportJobStatus.RUNNING
            session.commit()
            return job.id
        finally:
            if cache is not None:
                cache.delete("kombu:worker:import-lock")


def run_import(job_id: int) -> None:
    """Execute one claimed import using a worker-owned database session."""
    from api.app.services.recipe_importer import import_kaggle_dataset

    with SessionLocal() as session:
        import_kaggle_dataset(session, job_id)


def run() -> None:
    """Poll durable jobs until the worker receives a termination signal."""
    settings = get_settings()
    cache = redis.from_url(settings.cache_url) if settings.cache_url else None
    if cache is not None:
        cache.ping()
        logger.info("Kombu worker using shared cache lock")
    logger.info(
        "Kombu worker started; polling every %.1f seconds", settings.worker_poll_seconds
    )
    while True:
        job_id = claim_next_import(cache)
        if job_id is None:
            time.sleep(settings.worker_poll_seconds)
            continue
        logger.info("Processing import job %s", job_id)
        try:
            run_import(job_id)
        except Exception:
            logger.exception("Import job %s failed", job_id)


if __name__ == "__main__":
    logging.basicConfig(level=get_settings().log_level)
    run()
