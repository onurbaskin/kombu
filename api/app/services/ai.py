# ruff: noqa: E501
"""AI provider service using OpenRouter as the first provider."""

import hashlib
import json
import logging
from collections.abc import Sequence
from functools import lru_cache

from openai import OpenAI
from pydantic import BaseModel, Field

from api.app.config import get_settings

logger = logging.getLogger(__name__)


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


def _build_client() -> OpenAI | None:
    """Build an OpenAI-compatible client pointed at OpenRouter."""
    settings = get_settings()
    if not settings.openrouter_api_key:
        logger.warning("OpenRouter API key not configured, AI features disabled")
        return None
    return OpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )


def _cache_key(prompt: str, model: str) -> str:
    """Generate a deterministic cache key for a prompt."""
    return hashlib.sha256(f"{model}:{prompt}".encode()).hexdigest()


async def _chat_completion(
    messages: Sequence[dict[str, str]],
    *,
    response_format: type[BaseModel] | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    """Send a chat completion request to OpenRouter."""
    client = _build_client()
    if client is None:
        raise ValueError("OpenRouter API key not configured")

    settings = get_settings()

    kwargs: dict = {
        "model": settings.openrouter_model,
        "messages": messages,  # type: ignore[arg-type]
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if response_format is not None:
        schema = response_format.model_json_schema()
        json_schema = {
            "name": response_format.__name__,
            "strict": True,
            "schema": schema,
        }
        kwargs["response_format"] = {
            "type": "json_schema",
            "json_schema": json_schema,
        }

    response = client.chat.completions.create(**kwargs)  # type: ignore[arg-type]
    return response.choices[0].message.content or ""


async def suggest_inventory_alternatives(
    recipe_title: str,
    recipe_ingredients: list[str],
    inventory_items: list[dict[str, str]],
    expiry_items: list[dict[str, str]],
) -> dict:
    """Suggest ingredient substitutions based on what's in inventory.

    Returns a dict with ingredient matches and alternatives.
    """
    prompt = f"""You are a helpful kitchen assistant. Given a recipe and the user's current inventory,
suggest which recipe ingredients are available and provide substitutions for missing ones.

Recipe: {recipe_title}
Recipe ingredients: {json.dumps(recipe_ingredients)}
Available inventory: {json.dumps(inventory_items)}
Expiring soon: {json.dumps(expiry_items)}

For each recipe ingredient, indicate if it's available and suggest substitutions using what's in inventory.
Prioritize items that are expiring soon."""

    try:
        messages = [
            {
                "role": "system",
                "content": "You are a kitchen assistant. Respond with valid JSON matching the IngredientMatch schema for each ingredient.",
            },
            {"role": "user", "content": prompt},
        ]
        result = await _chat_completion(
            messages,
            response_format=IngredientMatch,
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
    """Suggest what to add to the shopping list based on history and context.

    Returns a dict with shopping suggestions.
    """
    prompt = f"""You are a helpful kitchen assistant. Based on the user's history and current situation,
suggest items they might need to add to their shopping list.

Previous shopping patterns: {json.dumps(previous_shopping)}
Current inventory status: {json.dumps(inventory_status)}
Planned recipes: {json.dumps(planned_recipes)}
Most frequently cooked: {json.dumps(frequently_cooked)}

Suggest items that make sense (not single-use small quantities like "1/2 tsp salt").
Focus on staples, fresh produce, and items that are likely running low.
Also consider what's expiring and what recipes need."""

    try:
        messages = [
            {
                "role": "system",
                "content": 'You are a kitchen assistant. Respond with valid JSON: {"suggestions": [{"item_name": "...", "reason": "...", "priority": "high|medium|low"}]}',
            },
            {"role": "user", "content": prompt},
        ]
        result = await _chat_completion(messages, temperature=0.5)
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
    """Enhance a recipe with better formatting, tips, and structure."""
    prompt = f"""You are a professional chef and recipe writer. Take this recipe and make it beautiful,
well-structured, and helpful.

Original title: {recipe_title}
Original summary: {recipe_summary or "N/A"}
Original instructions: {recipe_instructions or "N/A"}
Ingredients: {json.dumps(recipe_ingredients)}

Rewrite the recipe with:
1. A polished, appetizing title
2. A warm, inviting summary (2-3 sentences)
3. Well-formatted, clear step-by-step instructions with timing hints
4. 2-3 helpful cooking tips or variations

Format as valid JSON matching the EnhancedRecipe schema."""

    try:
        messages = [
            {
                "role": "system",
                "content": "You are a professional chef. Respond with valid JSON matching the EnhancedRecipe schema.",
            },
            {"role": "user", "content": prompt},
        ]
        result = await _chat_completion(
            messages,
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
    """Analyze photos to identify food items for inventory.

    Note: OpenRouter's text models don't support vision directly.
    This would need a vision-capable model via OpenRouter.
    """
    return {
        "error": "Photo analysis requires a vision-capable model. "
        "Configure OPENROUTER_MODEL to a supported vision model."
    }


@lru_cache(maxsize=128)
def _cached_completion(prompt_hash: str, model: str) -> str | None:
    """In-memory cache placeholder. Production would use a DB cache."""
    return None
