from api.app.main import app
from fastapi.testclient import TestClient


def test_healthz_returns_ok() -> None:
    """The public liveness endpoint should not require a database."""
    client = TestClient(app)

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_current_user_uses_safe_placeholder_identity() -> None:
    """The bootstrap user should not expose private project details."""
    client = TestClient(app)

    response = client.get("/api/v1/users/me")

    assert response.status_code == 200
    assert response.json()["email"] == "admin@example.invalid"


def test_openapi_includes_core_routes() -> None:
    """The OpenAPI schema should include the first product surfaces."""
    schema = app.openapi()

    assert "/api/v1/recipes" in schema["paths"]
    assert "/api/v1/inventory" in schema["paths"]
    assert "/api/v1/shopping-list" in schema["paths"]
    assert "/api/v1/scanner/capabilities" in schema["paths"]
