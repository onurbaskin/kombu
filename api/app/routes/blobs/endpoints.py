from api.app.storage import BlobNotFoundError, get_blob_store
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

router = APIRouter(prefix="/blobs", tags=["blobs"])


@router.get("/{blob_key:path}")
def get_blob(blob_key: str) -> Response:
    """Serve an application-owned blob from the configured storage backend."""
    try:
        content, content_type = get_blob_store().get(blob_key)
    except BlobNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Blob not found.") from exc
    return Response(content=content, media_type=content_type)
