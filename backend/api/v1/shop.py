"""Shop recommendations and search-URL endpoints."""
from __future__ import annotations

import urllib.parse
from typing import Optional

from fastapi import APIRouter, Body, Query

from backend.api.deps import DBDep, CurrentUserDep
from backend.schemas.shop import InteractionRequest, RecommendationsResponse
from backend.services import recommendation_service, shopping_search, preference_service

router = APIRouter(prefix="/shop", tags=["shop"])

_BUDGET_SUFFIX = {"budget": "under 1500", "mid": "under 4000", "premium": ""}

_PLATFORM_TEMPLATES = {
    "myntra":   "https://www.myntra.com/search?q={q}",
    "nykaa":    "https://www.nykaafashion.com/search-result/?q={q}",
    "flipkart": "https://www.flipkart.com/search?q={q}&otracker=search",
    "amazon":   "https://www.amazon.in/s?k={q}",
    "meesho":   "https://meesho.com/search?q={q}",
}


def _build_url(platform: str, query: str) -> str:
    tpl = _PLATFORM_TEMPLATES.get(platform, _PLATFORM_TEMPLATES["myntra"])
    return tpl.format(q=urllib.parse.quote(query.strip()))


@router.get("/search-url")
async def get_search_url(
    styles: str = Query(default="", description="Comma-separated style categories"),
    category: str = Query(default="", description="Garment category"),
    budget: str = Query(default="", description="budget | mid | premium"),
    platform: str = Query(default="myntra", description="Target shopping platform"),
    q: str = Query(default="", description="Free-text override query"),
) -> dict:
    """Build a shopping platform search URL from style preferences.

    Returns:
        search_url: The primary platform URL to open in a browser.
        all_platforms: Search URLs for all supported platforms.
        query: The normalised query string used.
    """
    if q:
        query = q
    else:
        parts: list[str] = ["women"]
        if category:
            parts.insert(0, category)
        elif styles:
            parts.insert(0, styles.split(",")[0].strip())
        suffix = _BUDGET_SUFFIX.get(budget, "")
        if suffix:
            parts.append(suffix)
        query = " ".join(parts)

    return {
        "platform": platform,
        "query": query,
        "search_url": _build_url(platform, query),
        "all_platforms": {p: _build_url(p, query) for p in _PLATFORM_TEMPLATES},
    }


@router.get("/live-search")
async def live_search(
    q: str = Query(..., description="Search query"),
    limit: int = Query(default=20, ge=1, le=50),
) -> dict:
    """Search across all configured shopping APIs concurrently.

    Returns:
        products: Merged, deduplicated list from SerpAPI / Flipkart / Amazon.
        query: The search query used.
    """
    products = await shopping_search.search_all(q, limit=limit)
    return {"query": q, "products": products, "count": len(products)}


@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(
    db: DBDep,
    current_user: CurrentUserDep,
    styles: str = Query(default=""),
    budget: Optional[str] = Query(default=None),
    occasions: str = Query(default=""),
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
) -> RecommendationsResponse:
    """Return personalised product recommendations."""
    user_id: str = current_user["sub"]
    styles_list = [s.strip() for s in styles.split(",") if s.strip()]
    occasions_list = [o.strip() for o in occasions.split(",") if o.strip()]

    return await recommendation_service.get_recommendations(
        db=db,
        user_id=user_id,
        styles=styles_list,
        budget=budget,
        occasions=occasions_list,
        category=category,
        limit=limit,
    )


@router.post("/interact", status_code=204)
async def record_interaction(
    db: DBDep,
    current_user: CurrentUserDep,
    body: InteractionRequest = Body(...),
) -> None:
    """Record a user interaction signal and update their preference vector."""
    user_id: str = current_user["sub"]
    await preference_service.record_interaction(
        db=db,
        user_id=user_id,
        product_id=body.product_id,
        product_title=body.product_title,
        product_category=body.product_category,
        product_platform=body.product_platform,
        product_image_url=body.product_image_url,
        product_url=body.product_url,
        interaction_type=body.interaction_type,
    )
