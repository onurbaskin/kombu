from collections.abc import Generator

import pytest
from api.app import worker
from api.app.database import Base
from api.app.models import ImportJob, ImportJobStatus
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


class FakeCache:
    def __init__(self, *, lock_available: bool = True) -> None:
        self.lock_available = lock_available
        self.deleted_keys: list[str] = []

    def set(self, key: str, value: str, *, nx: bool, ex: int) -> bool:
        assert key == "kombu:worker:import-lock"
        assert value
        assert nx is True
        assert ex == 30
        return self.lock_available

    def delete(self, key: str) -> None:
        self.deleted_keys.append(key)


@pytest.fixture
def worker_session() -> Generator[sessionmaker, None, None]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    original = worker.SessionLocal
    worker.SessionLocal = sessions
    try:
        yield sessions
    finally:
        worker.SessionLocal = original
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_claim_next_import_marks_oldest_job_running(
    worker_session: sessionmaker,
) -> None:
    with worker_session() as session:
        first = ImportJob(source_name="first", source_type="dataset")
        second = ImportJob(source_name="second", source_type="dataset")
        session.add_all([first, second])
        session.commit()
        first_id = first.id

    cache = FakeCache()
    assert worker.claim_next_import(cache) == first_id
    assert cache.deleted_keys == ["kombu:worker:import-lock"]

    with worker_session() as session:
        claimed = session.get(ImportJob, first_id)
        assert claimed is not None
        assert claimed.status == ImportJobStatus.RUNNING


def test_claim_next_import_skips_when_shared_lock_is_held(
    worker_session: sessionmaker,
) -> None:
    with worker_session() as session:
        session.add(ImportJob(source_name="first", source_type="dataset"))
        session.commit()

    cache = FakeCache(lock_available=False)
    assert worker.claim_next_import(cache) is None
    assert cache.deleted_keys == []
