"""ARQ background task: download an image and classify it with Gemini."""
from __future__ import annotations

import logging
import time

import httpx
from sqlalchemy import text

from backend.core.config import settings
from backend.core.database import AsyncSessionLocal
from backend.schemas.clothing import STATUS_ERROR, STATUS_READY
from backend.services.classifier import classify_clothing
from backend.workers.tasks.embed_task import embed_item_task

logger = logging.getLogger(__name__)


def _build_text_description(classification: object) -> str:
    garment_type = classification.type.value if classification.type else ""
    colors = " ".join(classification.colors)
    style = classification.style.value if classification.style else ""
    occasion = " ".join(o.value for o in classification.occasion)
    pattern = classification.pattern or ""
    fabric_guess = classification.fabric_guess or ""
    return f"{garment_type} {colors} {style} {occasion} {pattern} {fabric_guess}".strip()


async def _broadcast_realtime(item_id: str, user_id: str) -> None:
    """Fire-and-forget Supabase Realtime broadcast — failure must not fail the task."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                f"{settings.SUPABASE_URL}/realtime/v1/api/broadcast",
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json",
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                },
                json={
                    "messages": [{
                        "topic": f"realtime:public:clothing_items:user_id=eq.{user_id}",
                        "event": "item_classified",
                        "payload": {"item_id": item_id, "status": STATUS_READY},
                    }]
                },
            )
    except httpx.HTTPError as exc:
        # Broadcast is best-effort; never block task completion
        logger.warning("classify_clothing_task: broadcast failed item_id=%s: %s", item_id, exc)


async def classify_clothing_task(
    ctx: dict, item_id: str, image_url: str, user_id: str
) -> None:
    """Download *image_url*, classify the clothing item, update the DB, then broadcast.

    This task is idempotent: re-running with the same *item_id* is safe because
    it always overwrites the DB row with the latest result.

    The worker process is never crashed — all exceptions are caught, logged, and
    the item is marked status='error'.

    Args:
        ctx: ARQ worker context.
        item_id: UUID of the clothing_items row to update.
        image_url: Public URL of the image to classify.
        user_id: Owner's UUID — used to scope the Realtime broadcast channel.
    """
    start = time.monotonic()
    logger.info("classify_clothing_task: start item_id=%s", item_id)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            image_bytes = resp.content

        classification = await classify_clothing(image_bytes)

        async with AsyncSessionLocal() as session:
            await session.execute(
                text(
                    """
                    UPDATE clothing_items SET
                        status        = :status,
                        type          = :type,
                        colors        = :colors,
                        pattern       = :pattern,
                        fabric_guess  = :fabric_guess,
                        occasion      = :occasion,
                        season        = :season,
                        style         = :style,
                        fit           = :fit,
                        care_guess    = :care_guess
                    WHERE id = :item_id
                    """
                ),
                {
                    "status": STATUS_READY,
                    "type": classification.type.value if classification.type else None,
                    "colors": classification.colors,
                    "pattern": classification.pattern,
                    "fabric_guess": classification.fabric_guess,
                    "occasion": [o.value for o in classification.occasion],
                    "season": [s.value for s in classification.season],
                    "style": classification.style.value if classification.style else None,
                    "fit": classification.fit,
                    "care_guess": classification.care_guess,
                    "item_id": item_id,
                },
            )
            await session.commit()

        await _broadcast_realtime(item_id, user_id)

        text_description = _build_text_description(classification)
        await embed_item_task(ctx, item_id, text_description)

        elapsed = time.monotonic() - start
        logger.info(
            "classify_clothing_task: done item_id=%s status=%s elapsed=%.2fs",
            item_id,
            STATUS_READY,
            elapsed,
        )

    except Exception as exc:
        logger.error(
            "classify_clothing_task: error item_id=%s error=%s",
            item_id,
            exc,
            exc_info=True,
        )
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(
                    text("UPDATE clothing_items SET status = :status WHERE id = :item_id"),
                    {"status": STATUS_ERROR, "item_id": item_id},
                )
                await session.commit()
        except Exception as db_exc:
            logger.error(
                "classify_clothing_task: failed to set error status for item_id=%s: %s",
                item_id,
                db_exc,
            )

        elapsed = time.monotonic() - start
        logger.info(
            "classify_clothing_task: end (error) item_id=%s elapsed=%.2fs",
            item_id,
            elapsed,
        )
        # Never re-raise — would crash the ARQ worker
