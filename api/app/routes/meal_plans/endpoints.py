from datetime import date, timedelta
from typing import Annotated

from api.app.auth import require_permission
from api.app.database import get_session
from api.app.models import MealPlanOccurrence, MealPlanSeries, User
from api.app.routes.meal_plans.schemas import (
    MealPlanCreate,
    MealPlanOccurrenceRead,
    MealPlanSeriesRead,
)
from api.app.routes.meal_plans.utils import (
    create_meal_plan,
    meal_plan_query,
    occurrence_read,
    series_read,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/meal-plans", tags=["meal-plans"])
SessionDep = Annotated[Session, Depends(get_session)]
WriteDep = Annotated[User, Depends(require_permission("recipes:write"))]


@router.get("", response_model=list[MealPlanOccurrenceRead])
def list_occurrences(
    session: SessionDep,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[MealPlanOccurrenceRead]:
    """List scheduled meal occurrences in a calendar window."""
    start = start_date or date.today()
    end = end_date or (start + timedelta(days=31))
    if end < start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_date must be on or after start_date.",
        )
    if (end - start).days > 366:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Meal plan windows cannot exceed 366 days.",
        )
    return [occurrence_read(item) for item in meal_plan_query(session, start, end)]


@router.post("", response_model=MealPlanSeriesRead, status_code=status.HTTP_201_CREATED)
def create(
    payload: MealPlanCreate, session: SessionDep, _user: WriteDep
) -> MealPlanSeriesRead:
    """Schedule a recipe and return its materialized recurrence series."""
    series = create_meal_plan(session, payload)
    if series is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found."
        )
    return series_read(session, series)


@router.delete("/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_series(series_id: int, session: SessionDep, _user: WriteDep) -> None:
    """Delete a complete meal plan series and all of its occurrences."""
    series = session.get(MealPlanSeries, series_id)
    if series is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan series not found."
        )
    session.delete(series)
    session.commit()


@router.delete("/occurrences/{occurrence_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_occurrence(occurrence_id: int, session: SessionDep, _user: WriteDep) -> None:
    """Delete one occurrence while leaving the rest of its series intact."""
    occurrence = session.get(MealPlanOccurrence, occurrence_id)
    if occurrence is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan occurrence not found.",
        )
    session.delete(occurrence)
    session.commit()
