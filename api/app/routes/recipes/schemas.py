from datetime import datetime

from api.app.models import RecipeSourceType
from pydantic import BaseModel, ConfigDict, Field


class RecipeIngredientCreate(BaseModel):
    """Ingredient input for recipe creation."""

    name: str = Field(min_length=1, max_length=240)
    quantity: float | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=80)
    note: str | None = Field(default=None, max_length=240)


class RecipeIngredientRead(RecipeIngredientCreate):
    """Ingredient response for stored recipes."""

    id: int
    position: int
    model_config = ConfigDict(from_attributes=True)


class RecipeCreate(BaseModel):
    """Recipe creation request."""

    title: str = Field(min_length=1, max_length=240)
    summary: str | None = None
    source_url: str | None = Field(default=None, max_length=1024)
    source_type: RecipeSourceType = RecipeSourceType.USER
    cuisine: str | None = Field(default=None, max_length=120)
    yield_servings: int | None = Field(default=None, ge=1)
    prep_minutes: int | None = Field(default=None, ge=0)
    cook_minutes: int | None = Field(default=None, ge=0)
    is_favorite: bool = False
    ingredients: list[RecipeIngredientCreate] = Field(default_factory=list)


class RecipeRead(BaseModel):
    """Recipe response with ingredients."""

    id: int
    title: str
    summary: str | None
    source_url: str | None
    source_type: RecipeSourceType
    cuisine: str | None
    yield_servings: int | None
    prep_minutes: int | None
    cook_minutes: int | None
    is_favorite: bool
    created_at: datetime
    updated_at: datetime
    ingredients: list[RecipeIngredientRead]
    model_config = ConfigDict(from_attributes=True)
