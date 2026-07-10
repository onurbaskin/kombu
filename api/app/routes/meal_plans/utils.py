from calendar import monthrange
from datetime import date, timedelta
from typing import cast

from api.app.models import MealPlanOccurrence, MealPlanSeries, Recipe
from api.app.routes.meal_plans.schemas import (
    MealPlanCreate,
    MealPlanOccurrenceRead,
    MealPlanSeriesRead,
    RepeatFrequency,
)
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload


def next_month(current: date) -> date:
    """Advance a date by one month while clamping its day."""
    month = current.month + 1
    year = current.year
    if month == 13:
        month = 1
        year += 1
    return current.replace(
        day=min(current.day, monthrange(year, month)[1]), month=month, year=year
    )


def repeat_frequency(value: str) -> RepeatFrequency:
    """Validate a persisted repeat value before returning the API literal."""
    if value not in {"once", "daily", "weekly", "monthly"}:
        raise RuntimeError(f"Unknown meal plan repeat frequency: {value}")
    return cast(RepeatFrequency, value)


def occurrence_dates(payload: MealPlanCreate) -> list[date]:
    """Materialize a bounded recurrence series into concrete dates."""
    dates: list[date] = []
    current = payload.start_date
    maximum = payload.repeat_count or 366
    until = payload.repeat_until or (
        payload.start_date + timedelta(days=366)
        if payload.repeat_frequency != "once"
        else payload.start_date
    )
    while len(dates) < maximum and current <= until:
        dates.append(current)
        if payload.repeat_frequency == "once":
            break
        if payload.repeat_frequency == "daily":
            current += timedelta(days=payload.repeat_interval)
        elif payload.repeat_frequency == "weekly":
            current += timedelta(weeks=payload.repeat_interval)
        else:
            for _ in range(payload.repeat_interval):
                current = next_month(current)
    return dates


def occurrence_read(occurrence: MealPlanOccurrence) -> MealPlanOccurrenceRead:
    """Convert an occurrence with eagerly-loaded relationships to its API shape."""
    series = occurrence.series
    return MealPlanOccurrenceRead(
        id=occurrence.id,
        series_id=series.id,
        recipe_id=series.recipe_id,
        recipe_title=series.recipe.title,
        recipe_image_url=series.recipe.image_url,
        occurrence_date=occurrence.occurrence_date,
        start_time=occurrence.start_time,
        duration_minutes=occurrence.duration_minutes,
        repeat_frequency=repeat_frequency(series.repeat_frequency),
        repeat_interval=series.repeat_interval,
        repeat_count=series.repeat_count,
        repeat_until=series.repeat_until,
    )


def meal_plan_query(session: Session, start_date: date, end_date: date):
    """Build the occurrence query for a calendar window."""
    return session.scalars(
        select(MealPlanOccurrence)
        .join(MealPlanSeries)
        .options(
            selectinload(MealPlanOccurrence.series).selectinload(MealPlanSeries.recipe)
        )
        .where(
            MealPlanOccurrence.occurrence_date >= start_date,
            MealPlanOccurrence.occurrence_date <= end_date,
        )
        .order_by(MealPlanOccurrence.occurrence_date, MealPlanOccurrence.start_time)
    ).all()


def create_meal_plan(
    session: Session, payload: MealPlanCreate
) -> MealPlanSeries | None:
    """Create a recipe schedule and materialize its recurrence dates."""
    recipe = session.get(Recipe, payload.recipe_id)
    if recipe is None:
        return None
    series = MealPlanSeries(
        recipe_id=payload.recipe_id,
        start_date=payload.start_date,
        start_time=payload.start_time,
        duration_minutes=payload.duration_minutes,
        repeat_frequency=payload.repeat_frequency,
        repeat_interval=payload.repeat_interval,
        repeat_count=payload.repeat_count,
        repeat_until=payload.repeat_until,
    )
    series.occurrences = [
        MealPlanOccurrence(
            occurrence_date=occurrence_date,
            start_time=payload.start_time,
            duration_minutes=payload.duration_minutes,
        )
        for occurrence_date in occurrence_dates(payload)
    ]
    session.add(series)
    session.commit()
    session.refresh(series)
    return session.scalar(
        select(MealPlanSeries)
        .where(MealPlanSeries.id == series.id)
        .options(
            selectinload(MealPlanSeries.occurrences).selectinload(
                MealPlanOccurrence.series
            )
        )
    )


def series_read(session: Session, series: MealPlanSeries) -> MealPlanSeriesRead:
    """Build the response for a newly-created series."""
    refreshed = session.scalar(
        select(MealPlanSeries)
        .where(MealPlanSeries.id == series.id)
        .options(
            selectinload(MealPlanSeries.recipe),
            selectinload(MealPlanSeries.occurrences)
            .selectinload(MealPlanOccurrence.series)
            .selectinload(MealPlanSeries.recipe),
        )
    )
    if refreshed is None:
        raise RuntimeError("Meal plan series was not found after creation.")
    return MealPlanSeriesRead(
        id=refreshed.id,
        recipe_id=refreshed.recipe_id,
        repeat_frequency=repeat_frequency(refreshed.repeat_frequency),
        repeat_interval=refreshed.repeat_interval,
        repeat_count=refreshed.repeat_count,
        repeat_until=refreshed.repeat_until,
        occurrences=[occurrence_read(item) for item in refreshed.occurrences],
    )
