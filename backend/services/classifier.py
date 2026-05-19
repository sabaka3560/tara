"""Clothing classification via Gemini 2.5 Flash-Lite vision model.

Public API:
    classify_clothing(image_bytes) -> ClothingClassification
"""
from __future__ import annotations

import base64
import io
import logging

import google.generativeai as genai
from PIL import Image, ImageOps

from backend.core.config import settings
from backend.schemas.clothing import ClothingClassification
from backend.utils.helpers import safe_json

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash-lite"
CLASSIFICATION_SIZE = 512

CLASSIFY_PROMPT = """Analyze this image and classify the clothing item shown.

Return ONLY valid JSON — no markdown, no extra text.

If the image does NOT contain clothing, return exactly:
{"is_clothing": false}

If clothing is detected, return a JSON object with ALL of these fields:
{
  "is_clothing": true,
  "type": one of ["kurta","saree","lehenga","salwar","palazzo","jeans","dress","top","blazer","jacket","skirt","dupatta","other"],
  "colors": list of 1-3 dominant color strings (e.g. ["navy blue", "gold"]),
  "pattern": short string describing pattern (e.g. "floral", "solid", "striped", "geometric", "embroidered"),
  "fabric_guess": short string for fabric (e.g. "cotton", "silk", "chiffon", "polyester"),
  "occasion": list of applicable occasions, each one of ["casual","office","festive","wedding","party","daily","sports"],
  "season": list of applicable seasons, each one of ["summer","winter","monsoon","all-season"],
  "style": one of ["ethnic","western","indo-western","formal","streetwear"],
  "fit": short string (e.g. "slim", "regular", "loose", "flared", "A-line"),
  "care_guess": short string for care instructions (e.g. "hand wash cold", "dry clean only", "machine wash")
}

Return ONLY the JSON object. No explanation, no markdown fences."""


def _fix_exif(img: Image.Image) -> Image.Image:
    """Apply EXIF orientation so rotated phone photos display correctly."""
    try:
        return ImageOps.exif_transpose(img)
    except Exception:
        return img


def _compress(image_bytes: bytes, max_size: int = CLASSIFICATION_SIZE) -> bytes:
    """Resize image to max_size x max_size and re-encode as JPEG."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = _fix_exif(img)
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


def _encode_b64(data: bytes) -> str:
    """Base64-encode bytes and return as ASCII string."""
    return base64.b64encode(data).decode("ascii")


async def classify_clothing(image_bytes: bytes) -> ClothingClassification:
    """Classify a clothing image using Gemini 2.5 Flash-Lite.

    Steps:
        1. Compress and EXIF-fix the image.
        2. Base64-encode for the Gemini API.
        3. Call Gemini and parse the JSON response.
        4. Validate that is_clothing is True.
        5. Return a validated ClothingClassification instance.

    Raises:
        ValueError: if the image does not contain clothing.
    """
    original_size = len(image_bytes)
    compressed = _compress(image_bytes)
    compressed_size = len(compressed)
    logger.info(
        "classify_clothing: image compressed %d bytes -> %d bytes",
        original_size,
        compressed_size,
    )

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(GEMINI_MODEL)

    image_part = {
        "inline_data": {
            "mime_type": "image/jpeg",
            "data": _encode_b64(compressed),
        }
    }

    response = model.generate_content([CLASSIFY_PROMPT, image_part])

    usage = getattr(response, "usage_metadata", None)
    if usage:
        logger.info(
            "classify_clothing: tokens — prompt=%s, candidates=%s, total=%s",
            getattr(usage, "prompt_token_count", "?"),
            getattr(usage, "candidates_token_count", "?"),
            getattr(usage, "total_token_count", "?"),
        )

    raw_text = response.text
    result = safe_json(raw_text, fallback={"is_clothing": False})

    if not result.get("is_clothing", False):
        raise ValueError("Image does not contain a clothing item")

    return ClothingClassification(**result)
