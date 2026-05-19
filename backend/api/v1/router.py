"""API v1 root router — aggregates all feature sub-routers."""
from fastapi import APIRouter

from backend.api.v1 import wardrobe, outfits, shop, profile

router = APIRouter(prefix="/api/v1")

router.include_router(wardrobe.router)
router.include_router(outfits.router)
router.include_router(shop.router)
router.include_router(profile.router)
