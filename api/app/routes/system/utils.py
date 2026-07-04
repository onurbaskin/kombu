from typing import Any

from api.app.config import Settings
from api.app.models import (
    ImportJob,
    InventoryItem,
    Recipe,
    ScanSession,
    ShoppingListItem,
)
from api.app.routes.system.schemas import (
    FeatureFlag,
    NavigationItem,
    OverviewMetric,
    ReadinessRead,
    SystemOverviewRead,
)
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


def count_rows(session: Session, model: Any) -> int:
    """Count rows for a model, returning zero when migrations are not ready."""
    try:
        value = session.scalar(select(func.count()).select_from(model))
    except SQLAlchemyError:
        return 0
    return int(value or 0)


def build_features(settings: Settings) -> list[FeatureFlag]:
    """Build feature flags for the current deployment."""
    return [
        FeatureFlag(
            key="ai",
            label="AI assistance",
            enabled=settings.ai_features_enabled,
            description="Provider-neutral recipe, inventory, and planning assistance.",
        ),
        FeatureFlag(
            key="scanner",
            label="Scanner workflows",
            enabled=True,
            description=(
                "Camera, barcode, receipt, and dedicated scanner capture sessions."
            ),
        ),
        FeatureFlag(
            key="imports",
            label="Recipe imports",
            enabled=True,
            description=(
                "Import-ready queues for datasets, CSV, JSON, and web recipes."
            ),
        ),
        FeatureFlag(
            key="sso",
            label="SSO ready",
            enabled=False,
            description=(
                "Multi-user data model is ready for a future OIDC/SAML provider."
            ),
        ),
    ]


def build_navigation() -> list[NavigationItem]:
    """Build stable navigation for the first Kombu UI."""
    return [
        NavigationItem(label="Dashboard", href="/", section="operate"),
        NavigationItem(label="Recipes", href="/recipes", section="cook"),
        NavigationItem(label="Inventory", href="/inventory", section="stock"),
        NavigationItem(label="Shopping", href="/shopping", section="stock"),
        NavigationItem(label="Scanner", href="/scanner", section="capture"),
        NavigationItem(label="Imports", href="/imports", section="capture"),
        NavigationItem(label="AI Lab", href="/ai", section="smart"),
        NavigationItem(label="Settings", href="/settings", section="admin"),
    ]


def build_overview(session: Session, settings: Settings) -> SystemOverviewRead:
    """Build the dashboard overview payload."""
    metrics = [
        OverviewMetric(
            key="recipes",
            label="Recipes",
            value=count_rows(session, Recipe),
            description="Cookbook entries ready to search and cook.",
        ),
        OverviewMetric(
            key="inventory",
            label="Inventory",
            value=count_rows(session, InventoryItem),
            description="Tracked pantry, fridge, freezer, and counter items.",
        ),
        OverviewMetric(
            key="shopping",
            label="Shopping list",
            value=count_rows(session, ShoppingListItem),
            description="Items waiting to be bought or replenished.",
        ),
        OverviewMetric(
            key="imports",
            label="Import jobs",
            value=count_rows(session, ImportJob),
            description="Dataset and recipe source import requests.",
        ),
        OverviewMetric(
            key="scans",
            label="Scan sessions",
            value=count_rows(session, ScanSession),
            description="Camera, barcode, receipt, and hardware scanner sessions.",
        ),
    ]
    return SystemOverviewRead(
        app_name=settings.app_name,
        environment=settings.environment,
        metrics=metrics,
        features=build_features(settings),
        navigation=build_navigation(),
    )


def check_readiness(session: Session) -> ReadinessRead:
    """Check whether required runtime dependencies are reachable."""
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return ReadinessRead(status="degraded", database="unavailable")
    return ReadinessRead(status="ok", database="ok")
