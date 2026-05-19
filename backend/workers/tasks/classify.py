"""ARQ background task: classify a clothing image and persist the results."""
from __future__ import annotations

import json
import logging

import aiohttp
from sqlalchemy import text

from backend.core.database import AsyncSessionLocal
from backend.services.classifier import classify_clothing
from backend.workers.tasks.embed_task import embed_item_task

logger = logging.getLogger(__name__)


async def classify_clothing_task(ctx: dict, item_id: str, image_url: str, user_id: str) -> None:
    logger.info("classify_clothing_task: start item_id=%s", item_id)
    try:
        async with aiohttp.ClientSession() as http:
            async with http.get(image_url) as resp:
                resp.raise_for_status()
                image_bytes = await resp.read()

        classification = await classify_clothing(image_bytes)

        garment_type = classification.type.value if classification.type else None
        colors = classification.colors or []
        pattern = classification.pattern
        occasion = [o.value for o in classification.occasion] if classification.occasion else []
        season = [s.value for s in classification.season] if classification.season else []
        style = classification.style.value if classification.style else None
        fit = classification.fit

        type_label = garment_type or "item"
        color_label = ", ".join(colors) if colors else "unknown color"
        pattern_label = pattern or "unknown pattern"
        style_label = style or "unknown style"
        occasion_label = ", ".join(occasion) if occasion else "general"

        text_description = (
            f"{type_label} in {color_label}, {pattern_label}, {style_label}, "
            f"suitable for {occasion_label}"
        )

        async with AsyncSessionLocal() as session:
            await session.execute(
                text(
                    "UPDATE clothing_items SET "
                    "type=:type, colors=:colors::text[], pattern=:pattern, "
                    "occasion=:occasion::text[], season=:season::text[], "
                    "style=:style, fit=:fit, status=:status "
                    "WHERE id=:item_id"
                ),
                {
                    "type": garment_type,
                    "colors": json.dumps(colors),
                    "pattern": pattern,
                    "occasion": json.dumps(occasion),
                    "season": json.dumps(season),
                    "style": style,
                    "fit": fit,
                    "status": "ready",
                    "item_id": item_id,
                },
            )
            await session.commit()

        await embed_item_task(ctx, item_id, text_description)

        logger.info("classify_clothing_task: done item_id=%s", item_id)

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
                    text("UPDATE clothing_items SET status=:status WHERE id=:item_id"),
                    {"status": "error", "item_id": item_id},
                )
                await session.commit()
        except Exception as db_exc:
            logger.error(
                "classify_clothing_task: failed to set error status item_id=%s error=%s",
                item_id,
                db_exc,
            )
