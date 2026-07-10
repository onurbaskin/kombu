import pytest
from api.app.storage import BlobNotFoundError, LocalBlobStore


def test_local_blob_store_round_trips_content_and_type(tmp_path) -> None:
    store = LocalBlobStore(str(tmp_path / "blobs"))

    store.put("recipe-images/1/test.jpg", b"image-bytes", "image/jpeg")

    assert store.get("recipe-images/1/test.jpg") == (b"image-bytes", "image/jpeg")


def test_local_blob_store_rejects_traversal(tmp_path) -> None:
    store = LocalBlobStore(str(tmp_path / "blobs"))

    with pytest.raises(ValueError):
        store.put("../outside.txt", b"unsafe", "text/plain")

    with pytest.raises(BlobNotFoundError):
        store.get("missing.txt")
