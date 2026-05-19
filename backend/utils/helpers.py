"""Pure utility functions — no side effects, no DB, no HTTP."""
from __future__ import annotations

import json
from typing import Generator

MARKDOWN_FENCE_JSON = "```json"
MARKDOWN_FENCE_PLAIN = "```"


def safe_json(text: str, fallback: dict | None = None) -> dict:
    """Parse JSON from *text*, stripping markdown code fences first.

    Returns *fallback* (default empty dict) on any parse error.
    """
    if fallback is None:
        fallback = {}
    cleaned = (
        text.strip()
        .removeprefix(MARKDOWN_FENCE_JSON)
        .removeprefix(MARKDOWN_FENCE_PLAIN)
        .removesuffix(MARKDOWN_FENCE_PLAIN)
        .strip()
    )
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return fallback


def chunks(lst: list, n: int) -> Generator[list, None, None]:
    """Yield successive *n*-sized chunks from *lst*."""
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def truncate_tokens(text: str, max_chars: int = 8000) -> str:
    """Trim *text* to at most *max_chars* characters."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars]


def cache_key(*parts: str) -> str:
    """Build a colon-joined cache key from *parts*."""
    return ":".join(str(p) for p in parts)
