from typing import Annotated

from api.app.auth import require_permission
from api.app.database import get_session
from api.app.models import IntegrationCredential, User
from api.app.routes.imports.schemas import (
    ImportCredentialRead,
    ImportCredentialUpdate,
    ImportJobCreate,
    ImportJobRead,
    ImportSourceRead,
)
from api.app.routes.imports.utils import (
    create_import_job,
    list_import_jobs,
    list_import_sources,
)
from api.app.runtime_settings import require_setting
from api.app.services.provider_credentials import (
    ProviderCredentialError,
    encrypt_api_key,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/imports", tags=["imports"])
SessionDep = Annotated[Session, Depends(get_session)]
EditorDep = Annotated[User, Depends(require_permission("imports:write"))]
ImportsEnabledDep = Annotated[None, Depends(require_setting("feature.imports", True))]


@router.get("/sources", response_model=list[ImportSourceRead])
def sources(session: SessionDep) -> list[ImportSourceRead]:
    """Return supported import source types."""
    return list_import_sources(session)


@router.get("/sources/{source_key}/credential", response_model=ImportCredentialRead)
def credential_status(
    source_key: str,
    session: SessionDep,
    _admin: Annotated[User, Depends(require_permission("settings:manage"))],
) -> ImportCredentialRead:
    """Return whether credentials exist for a shipped recipe source."""
    credential = session.scalar(
        select(IntegrationCredential).where(
            IntegrationCredential.integration_key == source_key
        )
    )
    return ImportCredentialRead(
        source_key=source_key,
        account_name=credential.account_name if credential else None,
        configured=credential is not None,
    )


@router.put("/sources/{source_key}/credential", response_model=ImportCredentialRead)
def save_credential(
    source_key: str,
    payload: ImportCredentialUpdate,
    session: SessionDep,
    _admin: Annotated[User, Depends(require_permission("settings:manage"))],
) -> ImportCredentialRead:
    """Encrypt and save credentials for a maintainer-defined recipe source."""
    if source_key not in {source.key for source in list_import_sources(session)}:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recipe source not found.")
    try:
        encrypted_secret = encrypt_api_key(payload.secret)
    except ProviderCredentialError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    credential = session.scalar(
        select(IntegrationCredential).where(
            IntegrationCredential.integration_key == source_key
        )
    )
    if credential is None:
        credential = IntegrationCredential(
            integration_key=source_key, encrypted_secret=encrypted_secret
        )
        session.add(credential)
    credential.account_name = payload.account_name
    credential.encrypted_secret = encrypted_secret
    session.commit()
    return ImportCredentialRead(
        source_key=source_key, account_name=credential.account_name, configured=True
    )


@router.get("/jobs", response_model=list[ImportJobRead])
def jobs(session: SessionDep) -> list[ImportJobRead]:
    """Return import jobs."""
    return [ImportJobRead.model_validate(job) for job in list_import_jobs(session)]


@router.post("/jobs", response_model=ImportJobRead, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: ImportJobCreate,
    session: SessionDep,
    _editor: EditorDep,
    _enabled: ImportsEnabledDep,
) -> ImportJobRead:
    """Create a durable import job for the Kombu worker."""
    if payload.source_type != "dataset":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Import source type '{payload.source_type}' is not available yet.",
        )

    credential = session.scalar(
        select(IntegrationCredential.id).where(
            IntegrationCredential.integration_key == "kaggle-recipes"
        )
    )
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Kaggle credentials must be configured before importing datasets.",
        )

    job = create_import_job(session, payload)
    return ImportJobRead.model_validate(job)
