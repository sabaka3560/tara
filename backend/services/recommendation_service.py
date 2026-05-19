"""
Recommendation engine.

Flow:
  1. Load wardrobe embeddings for the user (status='ready', embedding IS NOT NULL)
  2. If embeddings exist → compute centroid → pgvector cosine similarity search
  3. Apply attribute boosts (style, budget, occasion) and build reason strings
  4. If no embeddings (new user / wardrobe empty) → attribute-only browse query
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.schemas.shop import ProductRecommendation, RecommendationsResponse
from backend.services import preference_service

logger = logging.getLogger(__name__)

BUDGET_PRICE_RANGE: dict[str, tuple[int, int]] = {
    "budget": (0, 2000),
    "mid": (2001, 6000),
    "premium": (6001, 999_999),
}

# Score weights — must sum to ≤ 1.0 (base similarity carries the rest)
W_STYLE = 0.15
W_BUDGET = 0.10
W_OCCASION = 0.05

# Blend weights: how much learned preference vs wardrobe shape the query vector
W_PREF = 0.60
W_WARDROBE = 0.40


async def get_recommendations(
    db: AsyncSession,
    user_id: str,
    styles: list[str],
    budget: Optional[str],
    occasions: list[str],
    category: Optional[str],
    limit: int = 20,
) -> RecommendationsResponse:
    # Run wardrobe embeddings + preference vector fetch concurrently
    embeddings, pref_vec_raw, liked_ids = await asyncio.gather(
        _load_wardrobe_embeddings(db, user_id),
        preference_service.get_preference_vector(db, user_id),
        preference_service.get_liked_product_ids(db, user_id),
    )

    wardrobe_centroid: Optional[np.ndarray] = (
        _compute_centroid(embeddings) if embeddings else None
    )
    pref_vec: Optional[np.ndarray] = (
        np.array(pref_vec_raw, dtype=np.float32) if pref_vec_raw else None
    )

    query_vec = _blend_query(wardrobe_centroid, pref_vec)

    if query_vec is not None:
        price_lo, price_hi = BUDGET_PRICE_RANGE.get(budget or "", (0, 999_999))
        raw = await _similarity_search(
            db,
            centroid=query_vec.tolist(),
            category=category,
            occasions=occasions or None,
            min_price=price_lo,
            max_price=price_hi,
            fetch=limit * 2,
        )
        items = _rank_and_reason(raw, styles, occasions, budget, limit)
        source = "wardrobe_match" if wardrobe_centroid is not None else "preference_match"
        return RecommendationsResponse(
            items=items,
            source=source,
            wardrobe_items_used=len(embeddings),
            liked_product_ids=list(liked_ids),
        )

    # Cold start — no wardrobe and no interactions yet
    raw = await _browse(
        db,
        styles=styles or None,
        occasions=occasions or None,
        category=category,
        budget=budget,
        limit=limit,
    )
    items = _pref_reason(raw)
    return RecommendationsResponse(
        items=items,
        source="catalog_browse",
        wardrobe_items_used=0,
        liked_product_ids=list(liked_ids),
    )


def _blend_query(
    wardrobe: Optional[np.ndarray],
    pref: Optional[np.ndarray],
) -> Optional[np.ndarray]:
    """Blend wardrobe centroid and learned preference into a single query vector."""
    if wardrobe is not None and pref is not None:
        blended = W_PREF * pref + W_WARDROBE * wardrobe
        norm = np.linalg.norm(blended)
        return blended / norm if norm > 0 else blended
    if pref is not None:
        return pref
    if wardrobe is not None:
        return wardrobe
    return None


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

async def _load_wardrobe_embeddings(db: AsyncSession, user_id: str) -> list[list[float]]:
    result = await db.execute(
        text(
            """
            SELECT embedding
            FROM   clothing_items
            WHERE  user_id = :uid
              AND  status = 'ready'
              AND  embedding IS NOT NULL
            LIMIT  200
            """
        ),
        {"uid": user_id},
    )
    rows = result.fetchall()
    return [list(r[0]) for r in rows] if rows else []


def _compute_centroid(embeddings: list[list[float]]) -> list[float]:
    arr = np.array(embeddings, dtype=np.float32)
    centroid = arr.mean(axis=0)
    # Normalise so cosine distance stays meaningful
    norm = np.linalg.norm(centroid)
    if norm > 0:
        centroid = centroid / norm
    return centroid.tolist()


async def _similarity_search(
    db: AsyncSession,
    centroid: list[float],
    category: Optional[str],
    occasions: Optional[list[str]],
    min_price: int,
    max_price: int,
    fetch: int,
) -> list[dict]:
    centroid_str = f"[{','.join(str(x) for x in centroid)}]"
    result = await db.execute(
        text(
            """
            SELECT * FROM match_products(
              query_embedding    => :embedding::vector(768),
              match_count        => :count,
              filter_category    => :category,
              filter_occasions   => :occasions,
              min_price_inr      => :min_price,
              max_price_inr      => :max_price
            )
            """
        ),
        {
            "embedding": centroid_str,
            "count": fetch,
            "category": category,
            "occasions": occasions,
            "min_price": min_price,
            "max_price": max_price,
        },
    )
    cols = list(result.keys())
    return [dict(zip(cols, row)) for row in result.fetchall()]


async def _browse(
    db: AsyncSession,
    styles: Optional[list[str]],
    occasions: Optional[list[str]],
    category: Optional[str],
    budget: Optional[str],
    limit: int,
) -> list[dict]:
    price_lo, price_hi = BUDGET_PRICE_RANGE.get(budget or "", (0, 999_999))
    result = await db.execute(
        text(
            """
            SELECT * FROM browse_products(
              filter_category    => :category,
              filter_styles      => :styles,
              filter_occasions   => :occasions,
              min_price_inr      => :min_price,
              max_price_inr      => :max_price,
              match_count        => :count
            )
            """
        ),
        {
            "category": category,
            "styles": styles,
            "occasions": occasions,
            "min_price": price_lo,
            "max_price": price_hi,
            "count": limit,
        },
    )
    cols = list(result.keys())
    return [dict(zip(cols, row)) for row in result.fetchall()]


def _rank_and_reason(
    raw: list[dict],
    styles: list[str],
    occasions: list[str],
    budget: Optional[str],
    limit: int,
) -> list[ProductRecommendation]:
    scored: list[tuple[float, ProductRecommendation]] = []

    for p in raw:
        base: float = float(p.get("similarity", 0.5))

        style_bonus = W_STYLE if p["category"] in styles else 0.0
        occ_bonus = (
            W_OCCASION
            if occasions and any(o in occasions for o in (p["occasions"] or []))
            else 0.0
        )
        budget_bonus = 0.0
        if budget:
            lo, hi = BUDGET_PRICE_RANGE.get(budget, (0, 999_999))
            budget_bonus = W_BUDGET if lo <= p["price_inr"] <= hi else 0.0

        score = base + style_bonus + occ_bonus + budget_bonus

        reason = _reason_string(base, style_bonus, occ_bonus, budget_bonus, p)
        scored.append((
            score,
            ProductRecommendation(
                id=str(p["id"]),
                title=p["title"],
                category=p["category"],
                garment_type=p["garment_type"],
                occasions=p["occasions"] or [],
                colors=p["colors"] or [],
                price_inr=p["price_inr"],
                original_price_inr=p.get("original_price_inr"),
                platform=p["platform"],
                affiliate_url=p["affiliate_url"],
                image_url=p["image_url"],
                rating=float(p["rating"]) if p.get("rating") else None,
                similarity_score=round(score, 3),
                reason=reason,
            ),
        ))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored[:limit]]


def _pref_reason(raw: list[dict]) -> list[ProductRecommendation]:
    return [
        ProductRecommendation(
            id=str(p["id"]),
            title=p["title"],
            category=p["category"],
            garment_type=p["garment_type"],
            occasions=p["occasions"] or [],
            colors=p["colors"] or [],
            price_inr=p["price_inr"],
            original_price_inr=p.get("original_price_inr"),
            platform=p["platform"],
            affiliate_url=p["affiliate_url"],
            image_url=p["image_url"],
            rating=float(p["rating"]) if p.get("rating") else None,
            similarity_score=0.5,
            reason="Curated for your style",
        )
        for p in raw
    ]


def _reason_string(
    base: float,
    style_bonus: float,
    occ_bonus: float,
    budget_bonus: float,
    p: dict,
) -> str:
    if base >= 0.88:
        return "Very close to your wardrobe style"
    if base >= 0.78:
        return f"Similar to pieces you own"
    if style_bonus > 0:
        return f"Matches your {p['category']} taste"
    if occ_bonus > 0:
        return "Great for your occasions"
    if budget_bonus > 0:
        return "Fits your budget range"
    return "Picked for your wardrobe"
