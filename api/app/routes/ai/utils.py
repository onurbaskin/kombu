from api.app.config import Settings
from api.app.models import AiSuggestion
from api.app.routes.ai.schemas import AiCapabilityRead, AiSuggestionCreate
from sqlalchemy.orm import Session


def list_ai_capabilities(settings: Settings) -> list[AiCapabilityRead]:
    """List AI features that the deployment can expose."""
    openrouter_ready = bool(settings.openrouter_api_key)
    ai_gated = settings.ai_features_enabled

    return [
        AiCapabilityRead(
            key="recipe-planning",
            label="Recipe planning",
            enabled=ai_gated,
            description=(
                "Plan meals from recipes, inventory, and diet notes."
            ),
        ),
        AiCapabilityRead(
            key="inventory-insights",
            label="Inventory insights",
            enabled=ai_gated,
            description=(
                "Suggest what to cook or buy from expiry dates and stock levels."
            ),
        ),
        AiCapabilityRead(
            key="shopping-suggestions",
            label="Smart shopping suggestions",
            enabled=ai_gated,
            description=(
                "Suggest what to buy based on inventory gaps, "
                "planned recipes, and cooking history."
            ),
        ),
        AiCapabilityRead(
            key="inventory-photos",
            label="Photo inventory analysis",
            enabled=ai_gated and openrouter_ready,
            description=(
                "Scan food photos to populate inventory automatically."
            ),
        ),
        AiCapabilityRead(
            key="recipe-enhance",
            label="Recipe enhancement",
            enabled=ai_gated,
            description=(
                "Make mechanical recipes look polished, structured, "
                "and human-written with AI."
            ),
        ),
        AiCapabilityRead(
            key="ingredient-substitutions",
            label="Ingredient substitutions",
            enabled=ai_gated,
            description=(
                "Suggest alternatives when you're missing an ingredient "
                "based on what's in your inventory."
            ),
        ),
    ]


def build_local_suggestion(payload: AiSuggestionCreate, settings: Settings) -> str:
    """Build a deterministic provider-free suggestion for early deployments."""
    if settings.ai_features_enabled:
        return (
            "AI providers can be configured later; this scaffold stores the prompt "
            "and leaves the provider adapter boundary ready."
        )
    return (
        "AI is disabled in this deployment. Kombu saved the prompt and can still "
        "use inventory, expiry dates, recipes, and imports for deterministic planning."
    )


def create_ai_suggestion(
    session: Session,
    payload: AiSuggestionCreate,
    settings: Settings,
) -> AiSuggestion:
    """Create an AI suggestion record without calling an external provider."""
    suggestion = AiSuggestion(
        prompt=payload.prompt,
        context=payload.context,
        suggestion=build_local_suggestion(payload, settings),
    )
    session.add(suggestion)
    session.commit()
    session.refresh(suggestion)
    return suggestion
