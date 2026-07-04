from api.app.routes.health.schemas import HealthRead


def build_health_response() -> HealthRead:
    """Build a lightweight liveness response."""
    return HealthRead(status="ok", service="kombu-api", version="0.1.0")
