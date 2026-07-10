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
    image_url: str | None = Field(default=None, max_length=2048)
    instructions: str | None = None
    source_url: str | None = Field(default=None, max_length=1024)
    source_type: RecipeSourceType = RecipeSourceType.USER
    cuisine: str | None = Field(default=None, max_length=120)
    yield_servings: int | None = Field(default=None, ge=1)
    prep_minutes: int | None = Field(default=None, ge=0)
    cook_minutes: int | None = Field(default=None, ge=0)
    is_favorite: bool = False
    ingredients: list[RecipeIngredientCreate] = Field(default_factory=list)


class RecipeUpdate(BaseModel):
    """Partial recipe update request."""

    title: str | None = Field(default=None, min_length=1, max_length=240)
    summary: str | None = None
    image_url: str | None = Field(default=None, max_length=2048)
    instructions: str | None = None
    source_url: str | None = Field(default=None, max_length=1024)
    source_type: RecipeSourceType | None = None
    cuisine: str | None = Field(default=None, max_length=120)
    yield_servings: int | None = Field(default=None, ge=1)
    prep_minutes: int | None = Field(default=None, ge=0)
    cook_minutes: int | None = Field(default=None, ge=0)
    is_favorite: bool | None = None
    ingredients: list[RecipeIngredientCreate] | None = None


class RecipeImageRead(BaseModel):
    """Cached generated image for a recipe."""

    id: int
    prompt: str
    image_url: str
    provider: str
    model: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RecipeImageGenerateRequest(BaseModel):
    """Optional custom prompt for a generated recipe image."""

    prompt: str | None = Field(default=None, max_length=2000)


class RecipeVersionRead(BaseModel):
    """A complete recipe snapshot, including the virtual original version."""

    id: int
    recipe_id: int
    version_type: str
    title: str
    summary: str | None
    image_url: str | None
    instructions: str | None
    cuisine: str | None
    yield_servings: int | None
    prep_minutes: int | None
    cook_minutes: int | None
    ingredients: list[RecipeIngredientCreate] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RecipeVersionUpdate(BaseModel):
    """Editable fields for a stored recipe version."""

    title: str | None = Field(default=None, min_length=1, max_length=240)
    summary: str | None = None
    image_url: str | None = Field(default=None, max_length=2048)
    instructions: str | None = None
    cuisine: str | None = Field(default=None, max_length=120)
    yield_servings: int | None = Field(default=None, ge=1)
    prep_minutes: int | None = Field(default=None, ge=0)
    cook_minutes: int | None = Field(default=None, ge=0)
    ingredients: list[RecipeIngredientCreate] | None = None


class RecipeRead(BaseModel):
    """Recipe response with ingredients."""

    id: int
    title: str
    summary: str | None
    image_url: str | None
    instructions: str | None
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
    images: list[RecipeImageRead] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class RecipeListResponse(BaseModel):
    """Paginated recipe list."""

    items: list[RecipeRead]
    total: int
    page: int
    per_page: int
    model_config = ConfigDict(from_attributes=True)


class RecipeFilterValues(BaseModel):
    """Available filter values for the recipe listing sidebar."""

    cuisines: list[str]
    source_types: list[str]
    ingredients: list[str]
    max_prep_minutes: int | None = None
    max_cook_minutes: int | None = None
    model_config = ConfigDict(from_attributes=True)


class RecipeEnhancementRead(BaseModel):
    """Cached AI enhancement for a recipe."""

    title: str
    summary: str
    instructions: str
    tips: list[str] = Field(default_factory=list)
    cached: bool
    generated_at: datetime
    version_id: int | None = None


class IngredientSuggestionRead(BaseModel):
    """Inventory match and alternatives for one recipe ingredient."""

    name: str
    available: bool
    substitutions: list[str] = Field(default_factory=list)


class RecipeShoppingResult(BaseModel):
    """Result of intelligently adding missing recipe items to shopping."""

    added: list[str] = Field(default_factory=list)
    skipped_available: list[str] = Field(default_factory=list)
    skipped_household_quantity: list[str] = Field(default_factory=list)
