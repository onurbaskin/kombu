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
    assert "patch" in schema["paths"]["/api/v1/recipes/{recipe_id}"]
    assert "/api/v1/recipes/{recipe_id}/images" in schema["paths"]
    assert "delete" in schema["paths"]["/api/v1/shopping-list/{item_id}"]
    assert "/api/v1/ai/inventory/analyze-photos" not in schema["paths"]


def test_unavailable_imports_are_not_advertised_as_ready() -> None:
    """Only sources with an execution path should be available in settings."""
    client = TestClient(app)

    response = client.get("/api/v1/imports/sources")

    assert response.status_code == 200
    availability = {
        source["source_type"]: source["ready_for_import"] for source in response.json()
    }
    assert availability["json"] is False
    assert availability["csv"] is False


def test_unsupported_import_does_not_create_a_queued_job() -> None:
    """Reject source types that do not have an importer before persisting work."""
    client = TestClient(app)

    response = client.post(
        "/api/v1/imports/jobs",
        json={"source_name": "Open recipe JSON", "source_type": "json"},
    )

    assert response.status_code == 422
    assert "not available yet" in response.json()["detail"]
