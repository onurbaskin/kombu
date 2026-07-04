from datetime import UTC, date, datetime, timedelta

from api.app.models import InventoryItem
from api.app.routes.alerts.schemas import ExpiryAlertRead
from sqlalchemy import select
from sqlalchemy.orm import Session


def severity_for(days_until_expiry: int) -> str:
    """Map an expiry interval to a simple severity label."""
    if days_until_expiry < 0:
        return "expired"
    if days_until_expiry <= 2:
        return "urgent"
    return "soon"


def list_expiry_alerts(session: Session, days: int) -> list[ExpiryAlertRead]:
    """List inventory items expiring within the requested number of days."""
    today = datetime.now(UTC).date()
    cutoff = today + timedelta(days=days)
    statement = (
        select(InventoryItem)
        .where(InventoryItem.expires_on.is_not(None))
        .where(InventoryItem.expires_on <= cutoff)
        .order_by(InventoryItem.expires_on, InventoryItem.name)
    )
    alerts: list[ExpiryAlertRead] = []
    for item in session.scalars(statement).all():
        expires_on = item.expires_on or date.max
        days_until_expiry = (expires_on - today).days
        alerts.append(
            ExpiryAlertRead(
                item_id=item.id,
                name=item.name,
                location=item.location,
                expires_on=expires_on,
                days_until_expiry=days_until_expiry,
                severity=severity_for(days_until_expiry),
            ),
        )
    return alerts
