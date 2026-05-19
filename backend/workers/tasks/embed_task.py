"""ARQ background task: generate a text embedding for a clothing item and store it."""
from __future__ import annotations

import logging

import google.generativeai as genai
from sqlalchemy import text

from backend.core.config import settings
from backend.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIMS = 768


async def embed_item_task(ctx: dict, item_id: str, text_description: str) -> None:
    """Generate a 768-dim embedding for *text_description* and persist it.

    The *text_description* should follow the format:
        "{type} in {colors}, {pattern}, {style}, suitable for {occasion}"

    Errors are caught and logged; the worker is never crashed.

    Args:
        ctx: ARQ worker context.
        item_id: UUID of the clothing_items row to update.
        text_description: Human-readable description used to build the embedding.
    """
    logger.info("embed_item_task: start item_id=%s", item_id)
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)

        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text_description,
            task_type="RETRIEVAL_DOCUMENT",
        )
        embedding: list[float] = result["embedding"]

        if len(embedding) != EMBEDDING_DIMS:
            logger.warning(
                "embed_item_task: unexpected embedding dims=%d for item_id=%s",
                len(embedding),
                item_id,
            )

        async with AsyncSessionLocal() as session:
            await session.execute(
                text(
                    "UPDATE clothing_items SET embedding = :embedding WHERE id = :item_id"
                ),
                {"embedding": embedding, "item_id": item_id},
            )
            await session.commit()

        logger.info("embed_item_task: done item_id=%s dims=%d", item_id, len(embedding))

    except Exception as exc:
        logger.error(
            "embed_item_task: error item_id=%s error=%s",
            item_id,
            exc,
            exc_info=True,
        )
        # Never re-raise — would crash the ARQ worker
