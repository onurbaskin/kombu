from pydantic import BaseModel


class FeatureFlag(BaseModel):
    """Feature availability shown to the frontend."""

    key: str
    label: str
    enabled: bool
    description: str


class OverviewMetric(BaseModel):
    """Dashboard metric for the system overview."""

    key: str
    label: str
    value: int
    description: str


class NavigationItem(BaseModel):
    """Frontend navigation item provided by the API."""

    label: str
    href: str
    section: str


class SystemOverviewRead(BaseModel):
    """Initial dashboard payload for Kombu."""

    app_name: str
    environment: str
    metrics: list[OverviewMetric]
    features: list[FeatureFlag]
    navigation: list[NavigationItem]


class ReadinessRead(BaseModel):
    """Readiness result for services that need dependencies."""

    status: str
    database: str
