from typing import Annotated

from api.app.auth import require_permission
from api.app.database import get_session
from api.app.models import InventoryLocation, User
from api.app.routes.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemRead,
    InventoryPhotoImportRead,
)
from api.app.routes.inventory.utils import (
    create_inventory_item,
    create_inventory_items,
    list_inventory,
)
from api.app.runtime_settings import require_setting
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/inventory", tags=["inventory"])
SessionDep = Annotated[Session, Depends(get_session)]
WriteDep = Annotated[User, Depends(require_permission("inventory:write"))]

MAX_PHOTOS = 5
MAX_PHOTO_BYTES = 8 * 1024 * 1024
SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


@router.get("", response_model=list[InventoryItemRead])
def index(
    session: SessionDep,
    location: InventoryLocation | None = None,
) -> list[InventoryItemRead]:
    """List tracked inventory items."""
    return [
        InventoryItemRead.model_validate(item)
        for item in list_inventory(session, location)
    ]


@router.post("", response_model=InventoryItemRead, status_code=201)
def create(
    payload: InventoryItemCreate,
    session: SessionDep,
    _editor: WriteDep,
) -> InventoryItemRead:
    """Create a tracked inventory item."""
    item = create_inventory_item(session, payload)
    return InventoryItemRead.model_validate(item)


@router.post(
    "/import-photos",
    response_model=InventoryPhotoImportRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_setting("ai.inventory_photo_analysis"))],
)
async def import_photos(
    session: SessionDep,
    photos: Annotated[list[UploadFile], File(description="Inventory photos")],
    _editor: WriteDep,
) -> InventoryPhotoImportRead:
    """Analyze uploaded photos and insert the identified items into inventory."""
    if not photos or len(photos) > MAX_PHOTOS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Upload between 1 and {MAX_PHOTOS} photos.",
        )

    images: list[tuple[str, bytes]] = []
    for photo in photos:
        content_type = photo.content_type or ""
        if content_type not in SUPPORTED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"{photo.filename or 'Photo'} is not a supported image.",
            )
        image_bytes = await photo.read(MAX_PHOTO_BYTES + 1)
        if len(image_bytes) > MAX_PHOTO_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"{photo.filename or 'Photo'} exceeds the 8 MB limit.",
            )
        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{photo.filename or 'Photo'} is empty.",
            )
        images.append((content_type, image_bytes))

    from api.app.services.ai import analyze_inventory_photos

    try:
        analysis = await analyze_inventory_photos(images)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    if not analysis.items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No inventory items could be identified in those photos.",
        )

    payloads = [
        InventoryItemCreate(
            **item.model_dump(),
            source="ai-photo",
        )
        for item in analysis.items
    ]
    created = create_inventory_items(session, payloads)
    return InventoryPhotoImportRead(
        items=[InventoryItemRead.model_validate(item) for item in created]
    )
