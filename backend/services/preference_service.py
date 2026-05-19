"""User preference vector — the learning layer of the recommendation engine.

Each interaction shifts the user's preference_vector toward (positive signals)
or away from (dislike) the product's embedding via exponential moving average.

  pref_new = normalize(alpha * product_emb + (1 - alpha) * pref_old)   [like/save/purchase]
  pref_new = normalize(pref_old - beta * product_emb)                   [dislike]

On first interaction pref_old is initialised from the wardrobe centroid if it
exists, otherwise directly from the product embedding.
"""
from __future__ import annotations

import logging
from typing import Optional

import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# EMA step sizes per signal
_ALPHA: dict[str, float] = {
    "like":     0.20,
    "save":     0.35,
    "purchase": 0.50,
}
_BETA_DISLIKE = 0.15


def _vec_str(v: np.ndarray) -> str:
    return f"[{','.join(f'{x:.6f}' for x in v)}]"


def _normalize(v: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(v)
    return v / norm if norm > 0 else v


async def record_interaction(
    db: AsyncSession,
    user_id: str,
    product_id: str,
    product_title: str,
    product_category: str,
    product_platform: str,
    product_image_url: str,
    product_url: str,
    interaction_type: str,
) -> None:
    """Append an interaction event and update the preference vector."""
    await db.execute(
        text("""
            INSERT INTO user_interactions
              (user_id, product_id, product_title, product_category,
               product_platform, product_image_url, product_url, interaction_type)
            VALUES
              (:uid, :pid, :title, :category, :platform, :img, :url, :itype)
        """),
        {
            "uid":      user_id,
            "pid":      product_id,
            "title":    product_title,
            "category": product_category,
            "platform": product_platform,
            "img":      product_image_url,
            "url":      product_url,
            "itype":    interaction_type,
        },
    )

    # Fetch product embedding from catalog (only catalog products have embeddings)
    emb_row = await db.execute(
        text("SELECT embedding FROM products WHERE id::text = :pid AND embedding IS NOT NULL"),
        {"pid": product_id},
    )
    emb_result = emb_row.fetchone()
    if emb_result is None:
        # Live-search product — no embedding yet; record interaction, skip vector update
        await db.commit()
        return

    product_emb = np.array(list(emb_result[0]), dtype=np.float32)
    await _update_preference_vector(db, user_id, product_emb, interaction_type)
    await db.commit()


async def _update_preference_vector(
    db: AsyncSession,
    user_id: str,
    product_emb: np.ndarray,
    interaction_type: str,
) -> None:
    # Load current state
    row = await db.execute(
        text("""
            SELECT preference_vector, preference_interaction_count
            FROM   profiles
            WHERE  id = :uid
        """),
        {"uid": user_id},
    )
    profile = row.fetchone()
    if profile is None:
        return

    current_vec_raw, interaction_count = profile

    # Initialise pref vector from wardrobe centroid if this is the first interaction
    if current_vec_raw is None:
        centroid = await _wardrobe_centroid(db, user_id)
        current_vec = centroid if centroid is not None else product_emb.copy()
    else:
        current_vec = np.array(list(current_vec_raw), dtype=np.float32)

    if interaction_type == "dislike":
        new_vec = _normalize(current_vec - _BETA_DISLIKE * product_emb)
    else:
        alpha = _ALPHA.get(interaction_type, _ALPHA["like"])
        new_vec = _normalize(alpha * product_emb + (1.0 - alpha) * current_vec)

    await db.execute(
        text("""
            UPDATE profiles
            SET    preference_vector           = :vec::vector(768),
                   preference_updated_at       = now(),
                   preference_interaction_count = preference_interaction_count + 1
            WHERE  id = :uid
        """),
        {"vec": _vec_str(new_vec), "uid": user_id},
    )


async def _wardrobe_centroid(db: AsyncSession, user_id: str) -> Optional[np.ndarray]:
    result = await db.execute(
        text("""
            SELECT embedding FROM clothing_items
            WHERE  user_id = :uid AND status = 'ready' AND embedding IS NOT NULL
            LIMIT  200
        """),
        {"uid": user_id},
    )
    rows = result.fetchall()
    if not rows:
        return None
    arr = np.array([list(r[0]) for r in rows], dtype=np.float32)
    centroid = arr.mean(axis=0)
    return _normalize(centroid)


async def get_preference_vector(
    db: AsyncSession, user_id: str
) -> Optional[list[float]]:
    row = await db.execute(
        text("SELECT preference_vector FROM profiles WHERE id = :uid"),
        {"uid": user_id},
    )
    result = row.fetchone()
    if result is None or result[0] is None:
        return None
    return list(result[0])


async def get_liked_product_ids(
    db: AsyncSession, user_id: str, limit: int = 200
) -> set[str]:
    """Return IDs of products the user has liked/saved/purchased (for UI state)."""
    result = await db.execute(
        text("""
            SELECT DISTINCT product_id FROM user_interactions
            WHERE  user_id = :uid
              AND  interaction_type IN ('like', 'save', 'purchase')
            ORDER BY product_id
            LIMIT  :lim
        """),
        {"uid": user_id, "lim": limit},
    )
    return {r[0] for r in result.fetchall()}
