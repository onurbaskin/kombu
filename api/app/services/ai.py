# ruff: noqa: E501
"""AI provider service using LiteLLM for multi-provider support."""

import asyncio
import base64
import json
import logging
from datetime import date

import httpx
from litellm import completion as litellm_completion
from pydantic import BaseModel, Field, ValidationError, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.app.database import SessionLocal
from api.app.models import AiProviderConfig
from api.app.services.provider_credentials import decrypt_api_key, normalize_model

logger = logging.getLogger(__name__)

KNOWN_PROVIDERS = [
    {
        "key": "openai",
        "label": "OpenAI",
        "docs": "https://platform.openai.com/api-keys",
    },
    {
        "key": "anthropic",
        "label": "Anthropic",
        "docs": "https://console.anthropic.com/",
    },
    {"key": "openrouter", "label": "OpenRouter", "docs": "https://openrouter.ai/keys"},
    {"key": "groq", "label": "Groq", "docs": "https://console.groq.com/keys"},
    {
        "key": "google",
        "label": "Google AI",
        "docs": "https://aistudio.google.com/apikey",
    },
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
    category: str = "Other"


class EnhancedRecipe(BaseModel):
    """AI-enhanced recipe content."""

    title: str
    summary: str
    instructions: str
    tips: list[str] = Field(default_factory=list)

    @field_validator("instructions", mode="before")
    @classmethod
    def normalize_instructions(cls, value: object) -> str:
        """Accept providers that return numbered steps as a JSON list."""
        if isinstance(value, list):
            return "\n".join(str(item) for item in value)
        return str(value)


class PhotoInventoryItem(BaseModel):
    """Inventory item identified in one or more kitchen photos."""

    name: str = Field(min_length=1, max_length=240)
    quantity: float = Field(default=1, ge=0)
    unit: str | None = Field(default=None, max_length=80)
    location: str = Field(
        default="pantry", pattern="^(pantry|fridge|freezer|counter|other)$"
    )
    expires_on: date | None = None
    notes: str | None = None


class PhotoInventoryResult(BaseModel):
    """Structured inventory extraction result returned by a vision model."""

    items: list[PhotoInventoryItem] = Field(default_factory=list)


class ImportedRecipeIngredient(BaseModel):
    """Ingredient extracted from a public recipe page."""

    name: str = Field(min_length=1, max_length=240)
    quantity: float | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=80)


class ImportedWebRecipe(BaseModel):
    """Recipe data extracted by an AI provider from webpage text."""

    title: str = Field(min_length=1, max_length=240)
    summary: str | None = None
    instructions: str | None = None
    cuisine: str | None = Field(default=None, max_length=120)
    yield_servings: int | None = Field(default=None, ge=1)
    prep_minutes: int | None = Field(default=None, ge=0)
    cook_minutes: int | None = Field(default=None, ge=0)
    ingredients: list[ImportedRecipeIngredient] = Field(default_factory=list)


def _get_active_provider(
    session: Session, *, image_capable: bool = False
) -> AiProviderConfig | None:
    """Return the first enabled provider, optionally preferring image models."""
    stmt = (
        select(AiProviderConfig)
        .where(AiProviderConfig.is_enabled.is_(True))
        .order_by(AiProviderConfig.created_at.asc())
    )
    configs = list(session.scalars(stmt).all())
    if image_capable:
        return next(
            (
                config
                for config in configs
                if config.provider == "openrouter"
                or "image" in config.default_model.casefold()
            ),
            None,
        )
    return configs[0] if configs else None


def _get_client_kwargs(config: AiProviderConfig) -> dict:
    """Build kwargs for litellm.completion from a provider config."""
    kwargs: dict = {
        "model": normalize_model(config.provider, config.default_model),
        "api_key": decrypt_api_key(config.encrypted_api_key),
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
            response = await asyncio.to_thread(litellm_completion, **kwargs)  # type: ignore[arg-type]
            return response.choices[0].message.content or ""
        except Exception as e:
            if response_format is None:
                logger.error("LiteLLM API error: %s", e)
                raise ValueError(str(e)) from e
            logger.warning(
                "Provider rejected structured output; retrying with JSON prompting: %s",
                e,
            )
            kwargs.pop("response_format", None)
            try:
                response = await asyncio.to_thread(  # type: ignore[arg-type]
                    litellm_completion, **kwargs
                )
                return response.choices[0].message.content or ""
            except Exception as retry_error:
                logger.error("LiteLLM API error after JSON fallback: %s", retry_error)
                raise ValueError(str(retry_error)) from retry_error


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
Assign each item a concise supermarket category such as Produce, Proteins, Dairy, Pantry, Frozen, or Household.
Respond with: {{"suggestions": [{{"item_name": "...", "reason": "...", "priority": "high|medium|low", "category": "..."}}]}}"""

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


async def extract_web_recipe(page_text: str) -> ImportedWebRecipe:
    """Extract a validated recipe from bounded readable webpage text."""
    prompt = f"""Extract one recipe from this webpage text.

Return valid JSON with title, summary, instructions, cuisine, yield_servings,
prep_minutes, cook_minutes, and ingredients. Each ingredient needs name and may
include quantity and unit. Do not invent facts that are absent from the page.

Webpage text:
{page_text}"""
    result = await _call_llm(
        [
            {
                "role": "system",
                "content": "You extract recipes. Return only JSON matching the requested recipe structure.",
            },
            {"role": "user", "content": prompt},
        ],
        response_format=ImportedWebRecipe,
        temperature=0.1,
        max_tokens=4096,
    )
    return ImportedWebRecipe.model_validate_json(result)


async def analyze_inventory_photos(
    images: list[tuple[str, bytes]],
) -> PhotoInventoryResult:
    """Identify visible kitchen stock from in-memory image uploads."""
    content: list[dict[str, object]] = [
        {
            "type": "text",
            "text": (
                "Identify food, drink, and household items clearly visible in these "
                "photos. Merge duplicates, estimate package counts conservatively, "
                "and do not invent hidden items. Use pantry when storage is unclear. "
                "Only provide an expiry date when it is readable in the image."
            ),
        }
    ]
    for content_type, image_bytes in images:
        encoded = base64.b64encode(image_bytes).decode("ascii")
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:{content_type};base64,{encoded}"},
            }
        )

    with SessionLocal() as session:
        config = _get_active_provider(session)
        if config is None:
            raise ValueError("No AI provider configured")
        kwargs = _get_client_kwargs(config)
        kwargs.update(
            {
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a careful kitchen inventory assistant. Return "
                            "only structured items actually visible in the images."
                        ),
                    },
                    {"role": "user", "content": content},
                ],
                "response_format": PhotoInventoryResult,
                "temperature": 0.1,
                "max_tokens": 2048,
            }
        )
        try:
            response = await asyncio.to_thread(litellm_completion, **kwargs)
        except Exception as exc:
            logger.warning(
                "Vision provider rejected structured output; retrying with JSON prompting: %s",
                exc,
            )
            kwargs.pop("response_format", None)
            try:
                response = await asyncio.to_thread(litellm_completion, **kwargs)
            except Exception as retry_error:
                logger.error(
                    "LiteLLM vision API error after JSON fallback: %s", retry_error
                )
                raise ValueError(str(retry_error)) from retry_error

    raw_content = response.choices[0].message.content or ""
    try:
        return PhotoInventoryResult.model_validate_json(raw_content)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ValueError(
            "The vision provider returned an invalid inventory response. "
            "Try another image-capable provider or a clearer photo."
        ) from exc


async def generate_recipe_image(
    recipe_title: str,
    recipe_summary: str | None,
    recipe_ingredients: list[str],
    recipe_instructions: str | None,
    custom_prompt: str | None = None,
) -> dict[str, str]:
    """Generate a recipe image through OpenRouter's dedicated image API."""
    with SessionLocal() as session:
        config = _get_active_provider(session, image_capable=True)
        if config is None:
            raise ValueError(
                "No enabled image-capable provider is configured. Add an OpenRouter image model in Settings."
            )
        api_key = decrypt_api_key(config.encrypted_api_key)
        model = config.default_model.removeprefix("openrouter/")
        base_url = (config.base_url or "https://openrouter.ai/api/v1").rstrip("/")

    prompt = (
        custom_prompt.strip()
        if custom_prompt and custom_prompt.strip()
        else (
            "Create a photorealistic, appetizing editorial food photograph for this recipe. "
            "Show the finished dish in a natural kitchen setting, with soft daylight, realistic "
            "textures, and no text, labels, logos, or people."
        )
    )
    full_prompt = f"""{prompt}

Recipe title: {recipe_title}
Summary: {recipe_summary or "Not provided"}
Ingredients: {json.dumps(recipe_ingredients)}
Instructions: {recipe_instructions or "Not provided"}
"""

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            response = await client.post(
                f"{base_url}/images",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://example.com/kombu",
                    "X-Title": "Kombu",
                },
                json={
                    "model": model,
                    "prompt": full_prompt,
                    "size": "1024x1024",
                    "output_format": "jpeg",
                },
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError as exc:
        logger.error("OpenRouter image API error: %s", exc)
        raise ValueError(f"Image provider request failed: {exc}") from exc

    try:
        image = payload["data"][0]
        encoded = image["b64_json"]
        media_type = image.get("media_type", "image/jpeg")
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("Image provider returned no image data.") from exc

    return {
        "prompt": full_prompt,
        "image_url": f"data:{media_type};base64,{encoded}",
        "provider": config.provider,
        "model": config.default_model,
    }
