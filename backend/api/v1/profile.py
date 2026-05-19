"""User style-profile and wear-log endpoints — stub implementation."""
from fastapi import APIRouter

STATUS_NOT_IMPLEMENTED = "not_implemented"

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/style")
async def get_style_profile() -> dict:
    """Return the current user's style profile (stub)."""
    return {"status": STATUS_NOT_IMPLEMENTED}


@router.put("/style")
async def update_style_profile() -> dict:
    """Update the current user's style profile (stub)."""
    return {"status": STATUS_NOT_IMPLEMENTED}


@router.post("/wear-log")
async def log_wear() -> dict:
    """Log that an outfit was worn on a specific date (stub)."""
    return {"status": STATUS_NOT_IMPLEMENTED}
