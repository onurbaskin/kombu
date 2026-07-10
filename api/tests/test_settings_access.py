"""Access-control and persisted settings API tests."""

from collections.abc import Callable, Generator

from api.app.auth import get_current_user
from api.app.database import Base, get_session
from api.app.main import app
from api.app.models import AppSetting, User, UserRole
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


def _database() -> tuple[
    sessionmaker[Session], Callable[[], Generator[Session, None, None]]
]:
    """Create an isolated settings database and bootstrap administrator."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with factory() as session:
        session.add_all(
            [
                User(
                    email="admin@example.invalid",
                    display_name="Administrator",
                    role=UserRole.ADMIN,
                ),
                User(
                    email="editor@example.invalid",
                    display_name="Editor",
                    role=UserRole.EDITOR,
                ),
                User(
                    email="viewer@example.invalid",
                    display_name="Viewer",
                    role=UserRole.VIEWER,
                ),
            ]
        )
        session.commit()

    def override() -> Generator[Session, None, None]:
        """Yield an isolated request session."""
        with factory() as session:
            yield session

    return factory, override


def _identity(factory: sessionmaker[Session], email: str) -> Callable[[], User]:
    """Build a test-only authenticated identity dependency."""

    def resolve() -> User:
        """Resolve the requested fixture identity."""
        with factory() as session:
            return session.query(User).filter_by(email=email).one()

    return resolve


def test_identity_header_cannot_impersonate_another_user() -> None:
    """Client input must not select the active administrator identity."""
    factory, override = _database()
    app.dependency_overrides[get_session] = override
    try:
        response = TestClient(app).get(
            "/api/v1/users/me", headers={"X-Kombu-User-Id": "3"}
        )
        assert response.status_code == 200
        assert response.json()["role"] == "admin"
        assert response.json()["email"] == "admin@example.invalid"
    finally:
        app.dependency_overrides.clear()


def test_editor_can_write_kitchen_data_but_not_manage_users() -> None:
    """Editors can operate the kitchen without gaining administrator access."""
    factory, override = _database()
    app.dependency_overrides[get_session] = override
    app.dependency_overrides[get_current_user] = _identity(
        factory, "editor@example.invalid"
    )
    try:
        client = TestClient(app)
        created = client.post(
            "/api/v1/inventory",
            json={"name": "Milk", "quantity": 1, "location": "fridge"},
        )
        invite = client.post(
            "/api/v1/users/invites",
            json={"email": "new@example.invalid", "role": "viewer"},
        )
        toggle = client.patch(
            "/api/v1/system/features/scanner", json={"enabled": False}
        )
        assert created.status_code == 201
        assert invite.status_code == 403
        assert toggle.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_admin_invites_and_updates_roles() -> None:
    """Administrators can invite users and assign supported roles."""
    factory, override = _database()
    app.dependency_overrides[get_session] = override
    try:
        client = TestClient(app)
        invite = client.post(
            "/api/v1/users/invites",
            json={"email": "new@example.invalid", "role": "editor"},
        )
        with factory() as session:
            viewer = session.query(User).filter_by(email="viewer@example.invalid").one()
            viewer_id = viewer.id
        update = client.patch(f"/api/v1/users/{viewer_id}", json={"role": "editor"})
        assert invite.status_code == 201
        assert invite.json()["role"] == "editor"
        assert update.status_code == 200
        assert update.json()["role"] == "editor"
    finally:
        app.dependency_overrides.clear()


def test_feature_and_capability_switches_persist_and_gate_requests() -> None:
    """Persisted switches must control API behavior, not only UI state."""
    factory, override = _database()
    app.dependency_overrides[get_session] = override
    try:
        client = TestClient(app)
        disabled = client.post(
            "/api/v1/ai/shopping/suggest",
            json={
                "shopping_history": [],
                "inventory_items": [],
                "planned_recipes": [],
                "frequently_cooked": [],
            },
        )
        feature = client.patch("/api/v1/system/features/ai", json={"enabled": True})
        capability = client.patch(
            "/api/v1/ai/capabilities/shopping_suggestions",
            json={"enabled": True},
        )
        assert disabled.status_code == 403
        assert feature.status_code == 200
        assert capability.status_code == 200
        with factory() as session:
            assert session.get(AppSetting, "feature.ai").value == "true"
            assert session.get(AppSetting, "ai.shopping_suggestions").value == "true"
    finally:
        app.dependency_overrides.clear()
