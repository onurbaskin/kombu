# ruff: noqa: E501
"""AI provider service using LiteLLM for multi-provider support."""

import json
import logging

from litellm import completion as litellm_completion
from litellm.exceptions import APIError as LiteLLMAPIError
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.app.database import SessionLocal
from api.app.models import AiProviderConfig

logger = logging.getLogger(__name__)

KNOWN_PROVIDERS = [
    {"key": "openai", "label": "OpenAI", "docs": "https://platform.openai.com/api-keys"},
    {"key": "anthropic", "label": "Anthropic", "docs": "https://console.anthropic.com/"},
    {"key": "openrouter", "label": "OpenRouter", "docs": "https://openrouter.ai/keys"},
    {"key": "groq", "label": "Groq", "docs": "https://console.groq.com/keys"},
    {"key": "google", "label": "Google AI", "docs": "https://aistudio.google.com/apikey"},
    {"key": "deepseek", "label": "DeepSeek", "docs": "https://platform.deepseek.com/"},
    {"key": "together_ai", "label": "Together AI", "docs": "https://api.together.xyz/"},
    {"key": "mistral", "label": "Mistral AI", "docs": "https://console.mistral.ai/"},
]


class IngredientMatch(BaseModel):
    """Ingredient pairing result from inventory."""

    name: str
    available: bool
    substitutions: list[str] = Field(default_factory=list)


class ShoppingSuggestion(BaseModel):
    """AI-generated shopping suggestion."""

    item_name: str
    reason: str
    priority: str = "medium"


class EnhancedRecipe(BaseModel):
    """AI-enhanced recipe content."""

    title: str
    summary: str
    instructions: str
    tips: list[str] = Field(default_factory=list)


def _get_active_provider(session: Session) -> AiProviderConfig | None:
    """Return the first enabled AI provider config."""
    stmt = (
        select(AiProviderConfig)
        .where(AiProviderConfig.is_enabled.is_(True))
        .order_by(AiProviderConfig.created_at.asc())
        .limit(1)
    )
    return session.scalars(stmt).first()


def _get_client_kwargs(config: AiProviderConfig) -> dict:
    """Build kwargs for litellm.completion from a provider config."""
    kwargs: dict = {
        "model": f"{config.provider}/{config.default_model}",
        "api_key": config.api_key,
    }
    if config.base_url:
        kwargs["api_base"] = config.base_url
    return kwargs


def has_available_provider() -> bool:
    """Check if any enabled AI provider is configured."""
    with SessionLocal() as session:
        return _get_active_provider(session) is not None


async def _call_llm(
    messages: list[dict[str, str]],
    *,
    response_format: type[BaseModel] | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    """Call LiteLLM with the first enabled provider."""
    with SessionLocal() as session:
        config = _get_active_provider(session)
        if config is None:
            raise ValueError("No AI provider configured")

        kwargs = _get_client_kwargs(config)
        kwargs["messages"] = messages  # type: ignore[assignment]
        kwargs["temperature"] = temperature
        kwargs["max_tokens"] = max_tokens

        if response_format is not None:
            kwargs["response_format"] = response_format

        try:
            response = litellm_completion(**kwargs)  # type: ignore[arg-type]
            return response.choices[0].message.content or ""
        except LiteLLMAPIError as e:
            logger.error("LiteLLM API error: %s", e)
            raise ValueError(str(e)) from e


async def suggest_inventory_alternatives(
    recipe_title: str,
    recipe_ingredients: list[str],
    inventory_items: list[dict[str, str]],
    expiry_items: list[dict[str, str]],
) -> dict:
    """Suggest ingredient substitutions based on inventory."""
    prompt = f"""You are a helpful kitchen assistant. Given a recipe and the user's current inventory,
suggest which recipe ingredients are available and provide substitutions for missing ones.

Recipe: {recipe_title}
Recipe ingredients: {json.dumps(recipe_ingredients)}
Available inventory: {json.dumps(inventory_items)}
Expiring soon: {json.dumps(expiry_items)}

For each recipe ingredient, indicate if it's available and suggest substitutions using what's in inventory.
Prioritize items that are expiring soon."""

    try:
        result = await _call_llm(
            [
                {
                    "role": "system",
                    "content": "You are a kitchen assistant. Respond with a JSON array where each item has: name (string), available (boolean), substitutions (array of strings).",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )
        return json.loads(result)
    except Exception as e:
        logger.exception("Failed to get inventory suggestions")
        return {"error": str(e)}


async def suggest_shopping_items(
    previous_shopping: list[dict[str, str]],
    inventory_status: list[dict[str, str]],
    planned_recipes: list[dict[str, str]],
    frequently_cooked: list[str],
) -> dict:
    """Suggest what to add to the shopping list."""
    prompt = f"""Based on the user's history and current situation, suggest items they might need.

Previous shopping patterns: {json.dumps(previous_shopping)}
Current inventory: {json.dumps(inventory_status)}
Planned recipes: {json.dumps(planned_recipes)}
Most frequently cooked: {json.dumps(frequently_cooked)}

Suggest items that make sense (not single-use small quantities).
Focus on staples, fresh produce, and items likely running low.
Respond with: {{"suggestions": [{{"item_name": "...", "reason": "...", "priority": "high|medium|low"}}]}}"""

    try:
        result = await _call_llm(
            [
                {
                    "role": "system",
                    "content": "You are a kitchen assistant. Respond with valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
        )
        return json.loads(result)
    except Exception as e:
        logger.exception("Failed to get shopping suggestions")
        return {"error": str(e)}


async def enhance_recipe(
    recipe_title: str,
    recipe_summary: str | None,
    recipe_instructions: str | None,
    recipe_ingredients: list[str],
) -> EnhancedRecipe | dict:
    """Enhance a recipe with better formatting."""
    prompt = f"""Take this recipe and make it beautiful and well-structured.

Original title: {recipe_title}
Original summary: {recipe_summary or "N/A"}
Original instructions: {recipe_instructions or "N/A"}
Ingredients: {json.dumps(recipe_ingredients)}

Return JSON with: title (polished), summary (2-3 warm sentences), instructions (clear steps with timing), tips (2-3 cooking tips)."""

    try:
        result = await _call_llm(
            [
                {
                    "role": "system",
                    "content": "You are a professional chef. Respond with valid JSON matching the EnhancedRecipe schema.",
                },
                {"role": "user", "content": prompt},
            ],
            response_format=EnhancedRecipe,
            temperature=0.7,
            max_tokens=4096,
        )
        data = json.loads(result)
        return EnhancedRecipe(**data)
    except Exception as e:
        logger.exception("Failed to enhance recipe")
        return {"error": str(e)}


async def analyze_inventory_photos(
    _image_paths: list[str],
) -> dict:
    """Analyze photos to identify food items."""
    return {
        "error": "Photo analysis requires a vision-capable model. "
        "Configure a provider with a vision model."
    }
