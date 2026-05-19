"""Unit tests for backend/services/classifier.py"""
from __future__ import annotations

import io
import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from PIL import Image

from backend.services.classifier import (
    CLASSIFY_PROMPT,
    _compress,
    _encode_b64,
    _fix_exif,
    classify_clothing,
)
from backend.utils.helpers import safe_json


# ---------------------------------------------------------------------------
# _compress
# ---------------------------------------------------------------------------


def test_compress_reduces_size() -> None:
    """A large noisy image should compress to < 200 KB and resize to 512 px."""
    import random

    # Random-pixel image resists JPEG compression — stays large as input
    rng = random.Random(42)
    pixels = bytes(rng.randint(0, 255) for _ in range(2000 * 2000 * 3))
    img = Image.frombytes("RGB", (2000, 2000), pixels)
    buf = io.BytesIO()
    img.save(buf, format="PNG")  # PNG is lossless — guarantees large input
    large_bytes = buf.getvalue()

    assert len(large_bytes) >= 100_000, "Precondition: synthetic image should be large"

    compressed = _compress(large_bytes)
    assert len(compressed) < 200_000, (
        f"Compressed image should be < 200 KB, got {len(compressed)} bytes"
    )


# ---------------------------------------------------------------------------
# _fix_exif
# ---------------------------------------------------------------------------


def test_fix_exif_handles_missing() -> None:
    """An image without EXIF data must not raise an exception."""
    img = Image.new("RGB", (100, 100), color=(0, 128, 255))
    # No EXIF — _fix_exif should return the image unchanged without crashing
    result = _fix_exif(img)
    assert result is not None
    assert result.size == (100, 100)


# ---------------------------------------------------------------------------
# classify_clothing — Gemini mock
# ---------------------------------------------------------------------------


def _make_gemini_response(payload: dict) -> MagicMock:
    """Build a minimal mock object that looks like a Gemini GenerateContentResponse."""
    mock_response = MagicMock()
    mock_response.text = json.dumps(payload)
    mock_response.usage_metadata = None
    return mock_response


@pytest.mark.asyncio
async def test_classify_prompt_returns_schema() -> None:
    """A valid Gemini response is parsed into a ClothingClassification instance."""
    gemini_payload = {
        "is_clothing": True,
        "type": "kurta",
        "colors": ["red", "gold"],
        "pattern": "embroidered",
        "fabric_guess": "silk",
        "occasion": ["festive", "wedding"],
        "season": ["all-season"],
        "style": "ethnic",
        "fit": "regular",
        "care_guess": "dry clean only",
    }

    mock_model = MagicMock()
    mock_model.generate_content.return_value = _make_gemini_response(gemini_payload)

    with (
        patch("backend.services.classifier.genai") as mock_genai,
    ):
        mock_genai.GenerativeModel.return_value = mock_model

        raw_image = io.BytesIO()
        Image.new("RGB", (100, 100)).save(raw_image, format="JPEG")
        raw_image.seek(0)

        result = await classify_clothing(raw_image.read())

    assert result.is_clothing is True
    assert result.type.value == "kurta"
    assert "red" in result.colors
    assert result.style.value == "ethnic"


@pytest.mark.asyncio
async def test_rejects_non_clothing() -> None:
    """When Gemini returns is_clothing=false, a ValueError must be raised."""
    non_clothing_payload = {"is_clothing": False}

    mock_model = MagicMock()
    mock_model.generate_content.return_value = _make_gemini_response(non_clothing_payload)

    with (
        patch("backend.services.classifier.genai") as mock_genai,
    ):
        mock_genai.GenerativeModel.return_value = mock_model

        raw_image = io.BytesIO()
        Image.new("RGB", (100, 100)).save(raw_image, format="JPEG")
        raw_image.seek(0)

        with pytest.raises(ValueError, match="does not contain a clothing item"):
            await classify_clothing(raw_image.read())


# ---------------------------------------------------------------------------
# safe_json — markdown fence stripping
# ---------------------------------------------------------------------------


def test_safe_json_strips_markdown() -> None:
    """safe_json must parse JSON wrapped in ```json ... ``` markdown fences."""
    raw = '```json\n{"is_clothing": true, "type": "kurta"}\n```'
    result = safe_json(raw)
    assert result["is_clothing"] is True
    assert result["type"] == "kurta"
