from pydantic import BaseModel


class HealthRead(BaseModel):
    """Public liveness response."""

    status: str
    service: str
    version: str
