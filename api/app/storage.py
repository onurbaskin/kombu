"""Durable blob storage for generated and uploaded application assets."""

from __future__ import annotations

import mimetypes
from functools import lru_cache
from pathlib import Path, PurePosixPath
from typing import Protocol

import boto3
from botocore.client import BaseClient

from api.app.config import Settings, get_settings


class BlobNotFoundError(FileNotFoundError):
    """Raised when a requested blob does not exist."""


class BlobStore(Protocol):
    """Storage interface shared by local and S3-compatible backends."""

    def put(self, key: str, content: bytes, content_type: str) -> None: ...

    def get(self, key: str) -> tuple[bytes, str]: ...


def _safe_key(key: str) -> str:
    """Reject keys that could escape the configured storage namespace."""
    path = PurePosixPath(key)
    if not key or path.is_absolute() or ".." in path.parts:
        raise ValueError("Blob key must be a relative path without parent traversal.")
    return str(path)


class LocalBlobStore:
    """Store blobs beneath a persistent local directory."""

    def __init__(self, root: str) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / _safe_key(key)).resolve()
        if self.root.resolve() not in path.parents:
            raise ValueError("Blob key escaped the configured storage root.")
        return path

    def put(self, key: str, content: bytes, content_type: str) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        path.with_suffix(path.suffix + ".content-type").write_text(
            content_type, encoding="utf-8"
        )

    def get(self, key: str) -> tuple[bytes, str]:
        path = self._path(key)
        if not path.is_file():
            raise BlobNotFoundError(key)
        content_type_path = path.with_suffix(path.suffix + ".content-type")
        content_type = (
            content_type_path.read_text(encoding="utf-8").strip()
            if content_type_path.is_file()
            else mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        )
        return path.read_bytes(), content_type


class S3BlobStore:
    """Store blobs through an S3-compatible API such as MinIO or Garage."""

    def __init__(self, settings: Settings) -> None:
        if not settings.s3_endpoint_url:
            raise ValueError("KOMBU_S3_ENDPOINT_URL is required for S3 storage.")
        if not settings.s3_access_key or not settings.s3_secret_key:
            raise ValueError(
                "KOMBU_S3_ACCESS_KEY and KOMBU_S3_SECRET_KEY are required "
                "for S3 storage."
            )
        self.bucket = settings.s3_bucket
        self.client: BaseClient = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name="us-east-1",
        )

    def put(self, key: str, content: bytes, content_type: str) -> None:
        self.client.put_object(
            Bucket=self.bucket,
            Key=_safe_key(key),
            Body=content,
            ContentType=content_type,
        )

    def get(self, key: str) -> tuple[bytes, str]:
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=_safe_key(key))
        except self.client.exceptions.NoSuchKey as exc:
            raise BlobNotFoundError(key) from exc
        return response["Body"].read(), response.get(
            "ContentType", "application/octet-stream"
        )


@lru_cache
def get_blob_store() -> BlobStore:
    """Return the configured process-local blob store client."""
    settings = get_settings()
    if settings.blob_storage_backend == "s3":
        return S3BlobStore(settings)
    return LocalBlobStore(settings.blob_storage_root)
