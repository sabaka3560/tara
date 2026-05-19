"""Wardrobe endpoints — upload, list, and delete clothing items."""
from __future__ import annotations

import base64
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.arq_pool import get_arq_pool
from backend.core.database import get_db
from backend.core.redis import get_redis
from backend.core.security import get_current_user
from backend.schemas.clothing import STATUS_PROCESSING, UploadResponse
from backend.services import storage_service
from backend.utils.rate_limiter import check_rate_limit

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
UPLOAD_DAILY_LIMIT = 20
UPLOAD_WINDOW_SECS = 86400
CLASSIFY_TASK = "classify_clothing_task"

router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])


def _user_id_from_payload(payload: dict) -> str:
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return uid


def _encode_cursor(created_at: datetime) -> str:
    return base64.urlsafe_b64encode(created_at.isoformat().encode()).decode()


def _decode_cursor(cursor: str) -> datetime:
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    return datetime.fromisoformat(raw)


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_item(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    payload: dict = Depends(get_current_user),
    arq_pool=Depends(get_arq_pool),
) -> UploadResponse:
    """Accept a clothing image, store it, and enqueue AI classification."""
    user_id = _user_id_from_payload(payload)
    await check_rate_limit(redis, user_id, "upload", UPLOAD_DAILY_LIMIT, UPLOAD_WINDOW_SECS)

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 10 MB limit")

    item_id = str(uuid.uuid4())
    content_type = file.content_type or "application/octet-stream"
    image_url = await storage_service.upload_image(user_id, item_id, file_bytes, content_type)

    insert_sql = text(
        "INSERT INTO clothing_items (id, user_id, image_url, status) VALUES (:id, :user_id, :image_url, :status)"
    )
    await db.execute(insert_sql, {"id": item_id, "user_id": user_id, "image_url": image_url, "status": STATUS_PROCESSING})
    await db.commit()

    await arq_pool.enqueue_job(CLASSIFY_TASK, item_id, image_url, user_id)
    return UploadResponse(item_id=item_id, status=STATUS_PROCESSING)


@router.get("/items")
async def list_items(
    cursor: str | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_user),
) -> dict:
    """Return a cursor-paginated list of wardrobe items for the current user."""
    user_id = _user_id_from_payload(payload)

    if cursor:
        cutoff = _decode_cursor(cursor)
        rows = await db.execute(
            text(
                "SELECT id, user_id, image_url, blurhash, status, type, colors, pattern,"
                " occasion, season, style, fit, wear_count, last_worn, created_at"
                " FROM clothing_items WHERE user_id = :uid AND created_at < :cutoff"
                " ORDER BY created_at DESC LIMIT :lim"
            ),
            {"uid": user_id, "cutoff": cutoff, "lim": limit + 1},
        )
    else:
        rows = await db.execute(
            text(
                "SELECT id, user_id, image_url, blurhash, status, type, colors, pattern,"
                " occasion, season, style, fit, wear_count, last_worn, created_at"
                " FROM clothing_items WHERE user_id = :uid"
                " ORDER BY created_at DESC LIMIT :lim"
            ),
            {"uid": user_id, "lim": limit + 1},
        )

    records = rows.mappings().all()
    has_more = len(records) > limit
    page = records[:limit]

    next_cursor = _encode_cursor(page[-1]["created_at"]) if has_more else None
    return {"items": [dict(r) for r in page], "next_cursor": next_cursor}


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_user),
) -> Response:
    """Permanently delete a clothing item; returns 404 if not owned by caller."""
    user_id = _user_id_from_payload(payload)

    row = await db.execute(
        text("SELECT id, user_id FROM clothing_items WHERE id = :id AND user_id = :uid"),
        {"id": item_id, "uid": user_id},
    )
    if row.first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    await db.execute(text("DELETE FROM clothing_items WHERE id = :id"), {"id": item_id})
    await db.commit()

    try:
        await storage_service.delete_image(user_id, item_id)
    except RuntimeError:
        pass  # best-effort; storage orphan is acceptable, item is already gone from DB

    return Response(status_code=status.HTTP_204_NO_CONTENT)
