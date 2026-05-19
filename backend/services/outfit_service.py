"""Outfit suggestion service powered by Claude Haiku with prompt caching.

Public API:
    suggest_outfits(wardrobe_items, occasion, weather) -> list[dict]
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path

import anthropic
from async_lru import alru_cache

from backend.core.config import settings
from backend.utils.helpers import safe_json

logger = logging.getLogger(__name__)

OUTFIT_MODEL = "claude-haiku-4-5-20251001"
OUTFIT_MAX_TOKENS = 1024

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "outfit_system.txt"


@alru_cache(maxsize=1)
async def _load_system_prompt() -> str:
    """Load the outfit system prompt from disk. Cached after first load."""
    return _PROMPT_PATH.read_text(encoding="utf-8")


async def suggest_outfits(
    wardrobe_items: list[dict],
    occasion: str,
    weather: str,
) -> list[dict]:
    """Generate outfit suggestions using Claude Haiku with a cached system prompt.

    Args:
        wardrobe_items: List of clothing item dicts from the user's wardrobe.
        occasion: Target occasion string (e.g. "casual", "wedding").
        weather: Current weather description (e.g. "hot and humid", "cool").

    Returns:
        List of outfit dicts, each with keys: items, occasion, reason, missing.
        Returns an empty list on any error.
    """
    try:
        system_prompt = await _load_system_prompt()

        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

        user_message = (
            f"Occasion: {occasion}\n"
            f"Weather: {weather}\n\n"
            f"Wardrobe items:\n{json.dumps(wardrobe_items, indent=2)}\n\n"
            "Suggest 3 outfits from these wardrobe items for the occasion and weather above. "
            "Return ONLY the JSON array as specified in your instructions."
        )

        response = await client.messages.create(
            model=OUTFIT_MODEL,
            max_tokens=OUTFIT_MAX_TOKENS,
            system=[
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {"role": "user", "content": user_message},
            ],
        )

        usage = response.usage
        logger.info(
            "suggest_outfits: tokens — input=%d, output=%d, "
            "cache_creation=%d, cache_read=%d",
            usage.input_tokens,
            usage.output_tokens,
            getattr(usage, "cache_creation_input_tokens", 0),
            getattr(usage, "cache_read_input_tokens", 0),
        )

        raw_text = response.content[0].text
        parsed = safe_json(raw_text, fallback=None)

        if parsed is None:
            logger.warning("suggest_outfits: safe_json returned None, returning []")
            return []

        if isinstance(parsed, list):
            return parsed

        # Handle the rare case where the model wraps the array in a dict
        if isinstance(parsed, dict):
            for val in parsed.values():
                if isinstance(val, list):
                    return val

        logger.warning("suggest_outfits: unexpected response shape, returning []")
        return []

    except Exception as exc:
        logger.error("suggest_outfits: error generating outfits: %s", exc, exc_info=True)
        return []
