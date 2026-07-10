import logging
from typing import Annotated

from api.app.auth import require_permission
from api.app.config import Settings, get_settings
from api.app.database import get_session
from api.app.models import AiProviderConfig
from api.app.routes.ai.schemas import (
    AiCapabilityRead,
    AiCapabilityUpdate,
    AiProviderConfigCreate,
    AiProviderConfigRead,
    AiProviderConfigUpdate,
    AiSuggestionCreate,
    AiSuggestionRead,
    KnownProviderRead,
)
from api.app.routes.ai.utils import create_ai_suggestion, list_ai_capabilities
from api.app.runtime_settings import require_setting, set_setting_enabled
from api.app.services.ai import EnhancedRecipe
from api.app.services.provider_credentials import (
    ProviderCredentialError,
    encrypt_api_key,
    normalize_model,
)
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])
SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
AdminDep = Annotated[object, Depends(require_permission("settings:manage"))]


def _provider_response(config: AiProviderConfig) -> AiProviderConfigRead:
    """Build a provider response without exposing credential material."""
    return AiProviderConfigRead(
        id=config.id,
        provider=config.provider,
        label=config.label,
        api_key_configured=bool(config.encrypted_api_key),
        base_url=config.base_url,
        default_model=config.default_model,
        is_enabled=config.is_enabled,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


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


@router.get("/capabilities", response_model=list[AiCapabilityRead])
def capabilities(session: SessionDep) -> list[AiCapabilityRead]:
    """Return AI capabilities for the current deployment."""
    return list_ai_capabilities(session)


@router.patch("/capabilities/{key}", response_model=AiCapabilityRead)
def update_capability(
    key: str, payload: AiCapabilityUpdate, session: SessionDep, _admin: AdminDep
) -> AiCapabilityRead:
    """Persist an administrator-controlled AI capability switch."""
    available = {item.key for item in list_ai_capabilities(session)}
    if key not in available:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "AI capability not found.")
    set_setting_enabled(session, f"ai.{key}", payload.enabled)
    return next(item for item in list_ai_capabilities(session) if item.key == key)


@router.post(
    "/suggestions",
    response_model=AiSuggestionRead,
    status_code=status.HTTP_201_CREATED,
)
def suggest(
    payload: AiSuggestionCreate,
    session: SessionDep,
) -> AiSuggestionRead:
    """Create a provider-free AI suggestion record."""
    suggestion = create_ai_suggestion(session, payload)
    return AiSuggestionRead.model_validate(suggestion)


@router.post("/shopping/suggest")
async def shopping_suggestions(
    payload: ShoppingSuggestRequest,
    _enabled: Annotated[None, Depends(require_setting("ai.shopping_suggestions"))],
) -> dict:
    """Get AI-powered shopping list suggestions."""
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
    _enabled: Annotated[None, Depends(require_setting("ai.recipe_enhancement"))],
) -> dict:
    """Enhance a recipe with AI-powered formatting."""
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
    _enabled: Annotated[None, Depends(require_setting("ai.inventory_substitutions"))],
) -> dict:
    """Get AI-powered ingredient substitution suggestions."""
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


@router.get("/providers/known", response_model=list[KnownProviderRead])
def known_providers() -> list[dict]:
    """Return the list of known AI provider types that users can configure."""
    from api.app.services.ai import KNOWN_PROVIDERS

    return KNOWN_PROVIDERS


@router.get("/providers", response_model=list[AiProviderConfigRead])
def list_providers(session: SessionDep) -> list[AiProviderConfigRead]:
    """List all configured AI providers."""
    stmt = select(AiProviderConfig).order_by(AiProviderConfig.created_at.desc())
    return [_provider_response(c) for c in session.scalars(stmt).all()]


@router.post(
    "/providers",
    response_model=AiProviderConfigRead,
    status_code=status.HTTP_201_CREATED,
)
def create_provider(
    payload: AiProviderConfigCreate,
    session: SessionDep,
    _admin: AdminDep,
) -> AiProviderConfigRead:
    """Add a new AI provider configuration."""
    try:
        config = AiProviderConfig(
            **payload.model_dump(exclude={"api_key", "default_model"}),
            encrypted_api_key=encrypt_api_key(payload.api_key),
            default_model=normalize_model(payload.provider, payload.default_model),
        )
    except ProviderCredentialError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    session.add(config)
    session.commit()
    session.refresh(config)
    return _provider_response(config)


@router.patch("/providers/{provider_id}", response_model=AiProviderConfigRead)
def update_provider(
    provider_id: int,
    payload: AiProviderConfigUpdate,
    session: SessionDep,
    _admin: AdminDep,
) -> AiProviderConfigRead:
    """Update an AI provider configuration."""
    config = session.get(AiProviderConfig, provider_id)
    if config is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found.",
        )
    update_data = payload.model_dump(exclude_unset=True)
    if "api_key" in update_data:
        try:
            config.encrypted_api_key = encrypt_api_key(update_data.pop("api_key"))
        except ProviderCredentialError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
            ) from exc
    if "default_model" in update_data:
        update_data["default_model"] = normalize_model(
            config.provider, update_data["default_model"]
        )
    for key, value in update_data.items():
        setattr(config, key, value)
    session.commit()
    session.refresh(config)
    return _provider_response(config)


@router.delete("/providers/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider(
    provider_id: int,
    session: SessionDep,
    _admin: AdminDep,
) -> None:
    """Delete an AI provider configuration."""
    config = session.get(AiProviderConfig, provider_id)
    if config is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found.",
        )
    session.delete(config)
    session.commit()
