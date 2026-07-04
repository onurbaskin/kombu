from api.app.routes.health.schemas import HealthRead
from api.app.routes.health.utils import build_health_response
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthRead)
def healthz() -> HealthRead:
    """Return a lightweight liveness check."""
    return build_health_response()
