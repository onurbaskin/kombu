"""Contract tests for photo inventory and contextual shopping workflows."""

from collections.abc import Callable, Generator

from api.app.auth import get_current_user
from api.app.database import Base, get_session
from api.app.main import app
from api.app.models import (
    AppSetting,
    InventoryItem,
    ShoppingItemStatus,
    ShoppingListItem,
    User,
    UserRole,
)
from api.app.services.ai import PhotoInventoryItem, PhotoInventoryResult
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


def _test_session() -> tuple[
    sessionmaker[Session], Callable[[], Generator[Session, None, None]]
]:
    """Create an isolated in-memory database dependency."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with factory() as session:
        session.add(
            User(
                email="admin@example.invalid",
                display_name="Test Administrator",
                role=UserRole.ADMIN,
            )
        )
        session.commit()

    def override() -> Generator[Session, None, None]:
        """Yield a test database session."""
        with factory() as session:
            yield session

    return factory, override


def test_photo_import_is_rejected_when_capability_is_disabled() -> None:
    """The persisted photo capability must gate the inventory endpoint."""
    factory, override = _test_session()
    app.dependency_overrides[get_session] = override
    try:
        response = TestClient(app).post(
            "/api/v1/inventory/import-photos",
            files={"photos": ("pantry.jpg", b"image", "image/jpeg")},
        )
        assert response.status_code == 403
        with factory() as session:
            assert session.query(InventoryItem).count() == 0
    finally:
        app.dependency_overrides.clear()


def test_viewer_cannot_mutate_inventory() -> None:
    """Viewer accounts can read kitchen data but cannot add stock."""
    factory, override = _test_session()
    with factory() as session:
        viewer = User(
            email="viewer@example.invalid",
            display_name="Test Viewer",
            role=UserRole.VIEWER,
        )
        session.add(viewer)
        session.commit()

    def override_user() -> User:
        """Resolve the viewer without trusting a client-controlled identity header."""
        with factory() as session:
            return session.query(User).filter_by(email="viewer@example.invalid").one()

    app.dependency_overrides[get_session] = override
    app.dependency_overrides[get_current_user] = override_user
    try:
        response = TestClient(app).post(
            "/api/v1/inventory",
            json={"name": "Milk", "quantity": 1, "location": "fridge"},
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_photo_import_analyzes_and_creates_inventory(monkeypatch) -> None:
    """Identified photo items should be inserted as AI-sourced inventory."""
    factory, override = _test_session()
    with factory() as session:
        session.add_all(
            [
                AppSetting(key="feature.ai", value="true"),
                AppSetting(key="ai.inventory_photo_analysis", value="true"),
            ]
        )
        session.commit()

    async def fake_analysis(_images: list[tuple[str, bytes]]) -> PhotoInventoryResult:
        """Return a deterministic vision result for the endpoint test."""
        return PhotoInventoryResult(
            items=[
                PhotoInventoryItem(
                    name="Tinned tomatoes", quantity=3, unit="tins", location="pantry"
                )
            ]
        )

    monkeypatch.setattr("api.app.services.ai.analyze_inventory_photos", fake_analysis)

    app.dependency_overrides[get_session] = override
    try:
        response = TestClient(app).post(
            "/api/v1/inventory/import-photos",
            files={"photos": ("pantry.jpg", b"image", "image/jpeg")},
        )
        assert response.status_code == 201
        assert response.json()["items"][0]["source"] == "ai-photo"
        with factory() as session:
            assert session.query(InventoryItem).count() == 1
    finally:
        app.dependency_overrides.clear()


def test_shopping_suggestions_use_server_side_history(monkeypatch) -> None:
    """Suggestion context should come from stored runs and current inventory."""
    factory, override = _test_session()
    with factory() as session:
        session.add_all(
            [
                AppSetting(key="feature.ai", value="true"),
                AppSetting(key="ai.shopping_suggestions", value="true"),
            ]
        )
        session.add(InventoryItem(name="Milk", quantity=0, unit="bottle"))
        session.add(
            ShoppingListItem(
                name="Milk",
                quantity=1,
                unit="bottle",
                category="Dairy",
                status=ShoppingItemStatus.PURCHASED,
            )
        )
        session.commit()

    captured: dict[str, object] = {}

    async def fake_suggestions(**kwargs) -> dict[str, object]:
        """Capture the derived context and return one proposal."""
        captured.update(kwargs)
        return {
            "suggestions": [
                {
                    "item_name": "Milk",
                    "reason": "It is empty and appears in previous runs.",
                    "priority": "high",
                    "category": "Dairy",
                }
            ]
        }

    monkeypatch.setattr("api.app.services.ai.suggest_shopping_items", fake_suggestions)

    app.dependency_overrides[get_session] = override
    try:
        response = TestClient(app).post("/api/v1/shopping-list/suggestions")
        assert response.status_code == 200
        assert response.json()["suggestions"][0]["item_name"] == "Milk"
        assert captured["previous_shopping"]
        assert captured["inventory_status"]
    finally:
        app.dependency_overrides.clear()
