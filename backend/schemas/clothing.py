"""Pydantic v2 schemas for clothing items — enums must match CONTRACTS.md exactly."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel

STATUS_PROCESSING = "processing"
STATUS_READY = "ready"
STATUS_ERROR = "error"


class GarmentType(str, Enum):
    kurta = "kurta"
    saree = "saree"
    lehenga = "lehenga"
    salwar = "salwar"
    palazzo = "palazzo"
    jeans = "jeans"
    dress = "dress"
    top = "top"
    blazer = "blazer"
    jacket = "jacket"
    skirt = "skirt"
    dupatta = "dupatta"
    other = "other"


class Occasion(str, Enum):
    casual = "casual"
    office = "office"
    festive = "festive"
    wedding = "wedding"
    party = "party"
    daily = "daily"
    sports = "sports"


class Season(str, Enum):
    summer = "summer"
    winter = "winter"
    monsoon = "monsoon"
    all_season = "all-season"


class StyleCategory(str, Enum):
    ethnic = "ethnic"
    western = "western"
    indo_western = "indo-western"
    formal = "formal"
    streetwear = "streetwear"


class ClothingClassification(BaseModel):
    is_clothing: bool
    type: Optional[GarmentType] = None
    colors: list[str] = []
    pattern: Optional[str] = None
    fabric_guess: Optional[str] = None
    occasion: list[Occasion] = []
    season: list[Season] = []
    style: Optional[StyleCategory] = None
    fit: Optional[str] = None
    care_guess: Optional[str] = None


class ClothingItem(BaseModel):
    id: str
    user_id: str
    image_url: str
    blurhash: str
    status: str
    type: Optional[GarmentType] = None
    colors: list[str] = []
    pattern: Optional[str] = None
    occasion: list[Occasion] = []
    season: list[Season] = []
    style: Optional[StyleCategory] = None
    fit: Optional[str] = None
    wear_count: int = 0
    last_worn: Optional[datetime] = None
    created_at: datetime


class ClothingItemCreate(BaseModel):
    user_id: str
    image_url: str
    status: str = STATUS_PROCESSING


class UploadResponse(BaseModel):
    item_id: str
    status: str
