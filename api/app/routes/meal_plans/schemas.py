from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

RepeatFrequency = Literal["once", "daily", "weekly", "monthly"]


class MealPlanCreate(BaseModel):
    """Request to schedule a recipe once or as a recurring series."""

    recipe_id: int = Field(gt=0)
    start_date: date
    start_time: str = Field(default="18:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    duration_minutes: int = Field(default=30, ge=15, le=240)
    repeat_frequency: RepeatFrequency = "once"
    repeat_interval: int = Field(default=1, ge=1, le=30)
    repeat_count: int | None = Field(default=None, ge=1, le=366)
    repeat_until: date | None = None


class MealPlanOccurrenceRead(BaseModel):
    """One scheduled meal occurrence with its recipe context."""

    id: int
    series_id: int
    recipe_id: int
    recipe_title: str
    recipe_image_url: str | None
    occurrence_date: date
    start_time: str
    duration_minutes: int
    repeat_frequency: RepeatFrequency
    repeat_interval: int
    repeat_count: int | None
    repeat_until: date | None


class MealPlanSeriesRead(BaseModel):
    """Created series summary returned after scheduling a recipe."""

    id: int
    recipe_id: int
    repeat_frequency: RepeatFrequency
    repeat_interval: int
    repeat_count: int | None
    repeat_until: date | None
    occurrences: list[MealPlanOccurrenceRead]


class PlannedShoppingItemRead(BaseModel):
    """Aggregated ingredient demand created by scheduled meals."""

    name: str
    quantity: float
    unit: str | None
    occurrence_count: int
    recipe_titles: list[str]
    first_needed_on: date
    already_needed: bool = False
