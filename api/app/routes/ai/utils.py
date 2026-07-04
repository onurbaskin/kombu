from api.app.config import Settings
from api.app.models import AiSuggestion
from api.app.routes.ai.schemas import AiCapabilityRead, AiSuggestionCreate
from sqlalchemy.orm import Session


def list_ai_capabilities(settings: Settings) -> list[AiCapabilityRead]:
    """List AI features that the deployment can expose."""
    return [
        AiCapabilityRead(
            key="recipe-planning",
            label="Recipe planning",
            enabled=settings.ai_features_enabled,
            description=("Plan meals from recipes, inventory, and diet notes."),
        ),
        AiCapabilityRead(
            key="inventory-insights",
            label="Inventory insights",
            enabled=settings.ai_features_enabled,
            description=(
                "Suggest what to cook or buy from expiry dates and stock levels."
            ),
        ),
        AiCapabilityRead(
            key="import-assistant",
            label="Import assistant",
            enabled=settings.ai_features_enabled,
            description="Help map user-provided datasets into Kombu recipe fields.",
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
