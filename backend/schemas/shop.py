"""Pydantic v2 schemas for shop recommendations."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel


class InteractionRequest(BaseModel):
    product_id:        str
    product_title:     str
    product_category:  str
    product_platform:  str
    product_image_url: str
    product_url:       str
    interaction_type:  Literal["like", "dislike", "save", "purchase"]


class ProductRecommendation(BaseModel):
    id: str
    title: str
    category: str
    garment_type: str
    occasions: list[str]
    colors: list[str]
    price_inr: int
    original_price_inr: Optional[int]
    platform: str
    affiliate_url: str
    image_url: str
    rating: Optional[float]
    similarity_score: float
    reason: str


class RecommendationsResponse(BaseModel):
    items: list[ProductRecommendation]
    source: str              # "wardrobe_match" | "preference_match" | "catalog_browse"
    wardrobe_items_used: int
    liked_product_ids: list[str] = []
