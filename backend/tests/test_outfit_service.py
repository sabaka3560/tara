"""Unit tests for backend/services/outfit_service.py"""
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.services.outfit_service import suggest_outfits


PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


# ---------------------------------------------------------------------------
# Prompt file existence
# ---------------------------------------------------------------------------


def test_prompt_file_exists() -> None:
    """backend/prompts/outfit_system.txt must exist and be at least 500 characters."""
    prompt_file = PROMPTS_DIR / "outfit_system.txt"
    assert prompt_file.exists(), f"Missing prompt file: {prompt_file}"
    content = prompt_file.read_text(encoding="utf-8")
    assert len(content) > 500, (
        f"Prompt file is too short: {len(content)} chars (expected > 500)"
    )


# ---------------------------------------------------------------------------
# cache_control presence
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_system_prompt_has_cache_control() -> None:
    """The Claude API call must include cache_control on the system prompt block."""
    outfits_payload = json.dumps([
        {
            "items": ["id1", "id2"],
            "occasion": "casual",
            "reason": "Comfortable and stylish.",
            "missing": "A light dupatta",
        }
    ])

    mock_content = MagicMock()
    mock_content.text = outfits_payload

    mock_usage = MagicMock()
    mock_usage.input_tokens = 800
    mock_usage.output_tokens = 200
    mock_usage.cache_creation_input_tokens = 600
    mock_usage.cache_read_input_tokens = 0

    mock_response = MagicMock()
    mock_response.content = [mock_content]
    mock_response.usage = mock_usage

    captured_kwargs: dict = {}

    async def fake_create(**kwargs):
        captured_kwargs.update(kwargs)
        return mock_response

    mock_messages = MagicMock()
    mock_messages.create = fake_create

    mock_client = MagicMock()
    mock_client.messages = mock_messages

    with patch("backend.services.outfit_service.anthropic.AsyncAnthropic", return_value=mock_client):
        # Clear alru_cache so the mock is actually reached
        from backend.services.outfit_service import _load_system_prompt
        _load_system_prompt.cache_clear()

        await suggest_outfits(
            wardrobe_items=[{"id": "id1", "type": "kurta"}, {"id": "id2", "type": "jeans"}],
            occasion="casual",
            weather="warm",
        )

    system_blocks = captured_kwargs.get("system", [])
    assert len(system_blocks) > 0, "No system blocks sent to Claude"
    first_block = system_blocks[0]
    assert "cache_control" in first_block, "cache_control missing from system block"
    assert first_block["cache_control"] == {"type": "ephemeral"}


# ---------------------------------------------------------------------------
# Returns list on success
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_suggest_returns_list() -> None:
    """suggest_outfits must return a list of dicts on a valid Claude response."""
    outfits_payload = json.dumps([
        {
            "items": ["a1", "a2"],
            "occasion": "festive",
            "reason": "Great festive combo.",
            "missing": "Heels",
        },
        {
            "items": ["b1"],
            "occasion": "casual",
            "reason": "Easy everyday look.",
            "missing": "Belt",
        },
    ])

    mock_content = MagicMock()
    mock_content.text = outfits_payload

    mock_usage = MagicMock()
    mock_usage.input_tokens = 500
    mock_usage.output_tokens = 150
    mock_usage.cache_creation_input_tokens = 0
    mock_usage.cache_read_input_tokens = 450

    mock_response = MagicMock()
    mock_response.content = [mock_content]
    mock_response.usage = mock_usage

    async def fake_create(**kwargs):
        return mock_response

    mock_messages = MagicMock()
    mock_messages.create = fake_create
    mock_client = MagicMock()
    mock_client.messages = mock_messages

    with patch("backend.services.outfit_service.anthropic.AsyncAnthropic", return_value=mock_client):
        from backend.services.outfit_service import _load_system_prompt
        _load_system_prompt.cache_clear()

        result = await suggest_outfits(
            wardrobe_items=[{"id": "a1"}, {"id": "a2"}, {"id": "b1"}],
            occasion="festive",
            weather="cool",
        )

    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0]["occasion"] == "festive"


# ---------------------------------------------------------------------------
# Graceful parse error handling
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_handles_parse_error() -> None:
    """suggest_outfits must return [] when the Claude response is invalid JSON."""
    mock_content = MagicMock()
    mock_content.text = "Sorry, I cannot help with that."  # Not valid JSON

    mock_usage = MagicMock()
    mock_usage.input_tokens = 300
    mock_usage.output_tokens = 10
    mock_usage.cache_creation_input_tokens = 0
    mock_usage.cache_read_input_tokens = 280

    mock_response = MagicMock()
    mock_response.content = [mock_content]
    mock_response.usage = mock_usage

    async def fake_create(**kwargs):
        return mock_response

    mock_messages = MagicMock()
    mock_messages.create = fake_create
    mock_client = MagicMock()
    mock_client.messages = mock_messages

    with patch("backend.services.outfit_service.anthropic.AsyncAnthropic", return_value=mock_client):
        from backend.services.outfit_service import _load_system_prompt
        _load_system_prompt.cache_clear()

        result = await suggest_outfits(
            wardrobe_items=[{"id": "x1"}],
            occasion="casual",
            weather="sunny",
        )

    assert result == []
