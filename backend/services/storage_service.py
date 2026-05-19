"""Supabase Storage integration — upload and delete clothing images."""
from __future__ import annotations

import httpx

from backend.core.config import settings

STORAGE_BUCKET = "wardrobe-images"
HTTP_OK_THRESHOLD = 300


def _object_path(user_id: str, item_id: str) -> str:
    return f"{STORAGE_BUCKET}/{user_id}/{item_id}"


def _storage_url(path: str) -> str:
    return f"{settings.SUPABASE_URL}/storage/v1/object/{path}"


def _auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}"}


async def upload_image(user_id: str, item_id: str, file_bytes: bytes, content_type: str) -> str:
    """Upload *file_bytes* to Supabase Storage and return the public URL.

    Raises RuntimeError on any non-2xx response so the caller can decide
    whether to abort or continue with a degraded record.
    """
    path = _object_path(user_id, item_id)
    url = _storage_url(path)
    headers = {**_auth_headers(), "Content-Type": content_type}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, content=file_bytes, headers=headers)

    if response.status_code >= HTTP_OK_THRESHOLD:
        raise RuntimeError(
            f"Storage upload failed: {response.status_code} {response.text[:200]}"
        )

    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{path}"


async def delete_image(user_id: str, item_id: str) -> None:
    """Delete the stored image from Supabase Storage.

    Raises RuntimeError on failure — callers should treat this as best-effort
    and not surface the error to the end user.
    """
    path = _object_path(user_id, item_id)
    url = _storage_url(path)

    async with httpx.AsyncClient() as client:
        response = await client.delete(url, headers=_auth_headers())

    if response.status_code >= HTTP_OK_THRESHOLD:
        raise RuntimeError(
            f"Storage delete failed: {response.status_code} {response.text[:200]}"
        )
