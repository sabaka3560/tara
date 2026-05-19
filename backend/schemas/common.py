"""Shared Pydantic response schemas used across multiple endpoints."""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel

APP_VERSION = "0.1.0"


class PaginatedResponse(BaseModel):
    items: list[Any]
    next_cursor: Optional[str] = None
    total: Optional[int] = None


class HealthResponse(BaseModel):
    status: str
    db: str
    redis: str
    version: str
