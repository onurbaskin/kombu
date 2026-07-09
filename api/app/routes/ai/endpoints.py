import logging
from typing import Annotated

from api.app.config import Settings, get_settings
from api.app.database import get_session
from api.app.routes.ai.schemas import (
    AiCapabilityRead,
    AiProviderConfigCreate,
    AiProviderConfigRead,
    AiProviderConfigUpdate,
    AiSuggestionCreate,
    AiSuggestionRead,
    KnownProviderRead,
)
from api.app.routes.ai.utils import create_ai_suggestion, list_ai_capabilities
from api.app.services.ai import EnhancedRecipe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])
SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


class ShoppingSuggestRequest(BaseModel):
    shopping_history: list[dict[str, str]] = Field(default_factory=list)
    inventory_items: list[dict[str, str]] = Field(default_factory=list)
    planned_recipes: list[dict[str, str]] = Field(default_factory=list)
    frequently_cooked: list[str] = Field(default_factory=list)


class RecipeEnhanceRequest(BaseModel):
    recipe_title: str
    recipe_summary: str | None = None
    recipe_instructions: str | None = None
    recipe_ingredients: list[str] = Field(default_factory=list)


class IngredientSubstitutionRequest(BaseModel):
    recipe_title: str
    recipe_ingredients: list[str] = Field(default_factory=list)
    inventory_items: list[dict[str, str]] = Field(default_factory=list)
    expiry_items: list[dict[str, str]] = Field(default_factory=list)


class PhotoAnalysisRequest(BaseModel):
    image_paths: list[str] = Field(default_factory=list)


@router.get("/capabilities", response_model=list[AiCapabilityRead])
def capabilities(settings: SettingsDep) -> list[AiCapabilityRead]:
    """Return AI capabilities for the current deployment."""
    return list_ai_capabilities(settings)


@router.post(
    "/suggestions",
    response_model=AiSuggestionRead,
    status_code=status.HTTP_201_CREATED,
)
def suggest(
    payload: AiSuggestionCreate,
    session: SessionDep,
    settings: SettingsDep,
) -> AiSuggestionRead:
    """Create a provider-free AI suggestion record."""
    suggestion = create_ai_suggestion(session, payload, settings)
    return AiSuggestionRead.model_validate(suggestion)


@router.post("/shopping/suggest")
async def shopping_suggestions(
    payload: ShoppingSuggestRequest,
    settings: SettingsDep,
) -> dict:
    """Get AI-powered shopping list suggestions."""
    if not settings.ai_features_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI features are not enabled.",
        )

    from api.app.services.ai import suggest_shopping_items

    try:
        result = await suggest_shopping_items(
            previous_shopping=payload.shopping_history,
            inventory_status=payload.inventory_items,
            planned_recipes=payload.planned_recipes,
            frequently_cooked=payload.frequently_cooked,
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e


@router.post("/recipes/enhance")
async def enhance_recipe(
    payload: RecipeEnhanceRequest,
    settings: SettingsDep,
) -> dict:
    """Enhance a recipe with AI-powered formatting."""
    if not settings.ai_features_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI features are not enabled.",
        )

    from api.app.services.ai import enhance_recipe as do_enhance

    try:
        result = await do_enhance(
            recipe_title=payload.recipe_title,
            recipe_summary=payload.recipe_summary,
            recipe_instructions=payload.recipe_instructions,
            recipe_ingredients=payload.recipe_ingredients,
        )
        if isinstance(result, EnhancedRecipe):
            return result.model_dump()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Unknown error"),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e


@router.post("/recipes/substitutions")
async def ingredient_substitutions(
    payload: IngredientSubstitutionRequest,
    settings: SettingsDep,
) -> dict:
    """Get AI-powered ingredient substitution suggestions."""
    if not settings.ai_features_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI features are not enabled.",
        )

    from api.app.services.ai import suggest_inventory_alternatives

    try:
        result = await suggest_inventory_alternatives(
            recipe_title=payload.recipe_title,
            recipe_ingredients=payload.recipe_ingredients,
            inventory_items=payload.inventory_items,
            expiry_items=payload.expiry_items,
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e


@router.post("/inventory/analyze-photos")
async def analyze_photos(
    payload: PhotoAnalysisRequest,
    settings: SettingsDep,
) -> dict:
    """Analyze food photos to identify inventory items."""
    if not settings.ai_features_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI features are not enabled.",
        )

    from api.app.services.ai import analyze_inventory_photos

    return await analyze_inventory_photos(payload.image_paths)


@router.get("/providers/known", response_model=list[KnownProviderRead])
def known_providers() -> list[dict]:
    """Return the list of known AI provider types that users can configure."""
    from api.app.services.ai import KNOWN_PROVIDERS

    return KNOWN_PROVIDERS


@router.get("/providers", response_model=list[AiProviderConfigRead])
def list_providers(session: SessionDep) -> list[AiProviderConfigRead]:
    """List all configured AI providers."""
    from api.app.models import AiProviderConfig

    stmt = select(AiProviderConfig).order_by(AiProviderConfig.created_at.desc())
    return [
        AiProviderConfigRead.model_validate(c)
        for c in session.scalars(stmt).all()
    ]


@router.post(
    "/providers",
    response_model=AiProviderConfigRead,
    status_code=status.HTTP_201_CREATED,
)
def create_provider(
    payload: AiProviderConfigCreate,
    session: SessionDep,
) -> AiProviderConfigRead:
    """Add a new AI provider configuration."""
    from api.app.models import AiProviderConfig

    config = AiProviderConfig(**payload.model_dump())
    session.add(config)
    session.commit()
    session.refresh(config)
    return AiProviderConfigRead.model_validate(config)


@router.patch("/providers/{provider_id}", response_model=AiProviderConfigRead)
def update_provider(
    provider_id: int,
    payload: AiProviderConfigUpdate,
    session: SessionDep,
) -> AiProviderConfigRead:
    """Update an AI provider configuration."""
    from api.app.models import AiProviderConfig

    config = session.get(AiProviderConfig, provider_id)
    if config is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found.",
        )
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    session.commit()
    session.refresh(config)
    return AiProviderConfigRead.model_validate(config)


@router.delete("/providers/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider(
    provider_id: int,
    session: SessionDep,
) -> None:
    """Delete an AI provider configuration."""
    from api.app.models import AiProviderConfig

    config = session.get(AiProviderConfig, provider_id)
    if config is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found.",
        )
    session.delete(config)
    session.commit()
