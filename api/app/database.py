from collections.abc import Generator
from pathlib import Path

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from api.app.config import get_settings


class Base(DeclarativeBase):
    """Base class for SQLAlchemy ORM models."""


def ensure_sqlite_parent(database_url: str) -> None:
    """Create the local SQLite parent directory when SQLite is configured."""
    sqlite_prefix = "sqlite:///"
    if not database_url.startswith(sqlite_prefix):
        return

    raw_path = database_url.removeprefix(sqlite_prefix)
    if raw_path in {"", ":memory:"}:
        return

    Path(raw_path).parent.mkdir(parents=True, exist_ok=True)


def build_engine(database_url: str) -> Engine:
    """Build a SQLAlchemy engine for SQLite or PostgreSQL-compatible URLs."""
    ensure_sqlite_parent(database_url)
    connect_args = (
        {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    )
    return create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)


settings = get_settings()
engine = build_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session() -> Generator[Session, None, None]:
    """Yield a database session for a FastAPI dependency."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
