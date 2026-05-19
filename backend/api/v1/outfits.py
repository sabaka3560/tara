"""Outfit suggestion endpoints."""
from fastapi import APIRouter, Body

from backend.services import outfit_service

router = APIRouter(prefix="/outfits", tags=["outfits"])


@router.post("/suggest")
async def suggest_outfits(
    occasion: str = Body(...),
    weather: str = Body(default="warm"),
) -> dict:
    """Generate AI outfit suggestions.

    Accepts wardrobe items from the request body or falls back to an empty
    wardrobe (frontend passes items once auth is wired).
    """
    wardrobe_items: list[dict] = Body(default=[])
    outfits = await outfit_service.suggest_outfits(wardrobe_items, occasion, weather)
    return {"outfits": outfits, "occasion": occasion}


@router.post("/save")
async def save_outfit(body: dict = Body(default={})) -> dict:
    """Save a user-confirmed outfit (stub — Phase 2)."""
    return {"status": "saved", "outfit_id": None}


@router.get("/history")
async def outfit_history() -> dict:
    """Return paginated outfit wear history (stub — Phase 2)."""
    return {"outfits": [], "total": 0}
