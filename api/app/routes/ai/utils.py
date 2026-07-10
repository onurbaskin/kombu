"""AI route utilities."""

from api.app.models import AiSuggestion
from api.app.routes.ai.schemas import AiCapabilityRead, AiSuggestionCreate
from api.app.runtime_settings import is_setting_enabled
from sqlalchemy.orm import Session


def list_ai_capabilities(session: Session) -> list[AiCapabilityRead]:
    """List AI features that the deployment can expose."""
    ai_gated = is_setting_enabled(session, "feature.ai", False)

    return [
        AiCapabilityRead(
            key="shopping_suggestions",
            label="Smart shopping suggestions",
            enabled=ai_gated
            and is_setting_enabled(session, "ai.shopping_suggestions", False),
            description="Suggest what to buy from inventory gaps and planned recipes.",
        ),
        AiCapabilityRead(
            key="inventory_photo_analysis",
            label="Photo inventory analysis",
            enabled=ai_gated
            and is_setting_enabled(session, "ai.inventory_photo_analysis", False),
            description="Scan food photos to populate inventory automatically.",
        ),
        AiCapabilityRead(
            key="recipe_enhancement",
            label="Recipe enhancement",
            enabled=ai_gated
            and is_setting_enabled(session, "ai.recipe_enhancement", False),
            description="Polish and structure recipes with AI-driven formatting.",
        ),
        AiCapabilityRead(
            key="inventory_substitutions",
            label="Ingredient substitutions",
            enabled=ai_gated
            and is_setting_enabled(session, "ai.inventory_substitutions", False),
            description="Suggest alternatives when you're missing an ingredient.",
        ),
    ]


def build_local_suggestion(payload: AiSuggestionCreate, session: Session) -> str:
    """Build a deterministic provider-free suggestion for early deployments."""
    if is_setting_enabled(session, "feature.ai", False):
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
) -> AiSuggestion:
    """Create an AI suggestion record without calling an external provider."""
    suggestion = AiSuggestion(
        prompt=payload.prompt,
        context=payload.context,
        suggestion=build_local_suggestion(payload, session),
    )
    session.add(suggestion)
    session.commit()
    session.refresh(suggestion)
    return suggestion
