from typing import Annotated

from api.app.config import Settings, get_settings
from api.app.database import get_session
from api.app.routes.ai.schemas import (
    AiCapabilityRead,
    AiSuggestionCreate,
    AiSuggestionRead,
)
from api.app.routes.ai.utils import create_ai_suggestion, list_ai_capabilities
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ai", tags=["ai"])
SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get("/capabilities", response_model=list[AiCapabilityRead])
def capabilities(settings: SettingsDep) -> list[AiCapabilityRead]:
    """Return AI capabilities for the current deployment."""
    return list_ai_capabilities(settings)


@router.post(
    "/suggestions", response_model=AiSuggestionRead, status_code=status.HTTP_201_CREATED
)
def suggest(
    payload: AiSuggestionCreate,
    session: SessionDep,
    settings: SettingsDep,
) -> AiSuggestionRead:
    """Create a provider-free AI suggestion record."""
    suggestion = create_ai_suggestion(session, payload, settings)
    return AiSuggestionRead.model_validate(suggestion)
