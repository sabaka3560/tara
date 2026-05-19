"""Shared ARQ pool — lazily initialized, reused across requests."""
from __future__ import annotations

from arq import create_pool
from arq.connections import RedisSettings

from backend.core.config import settings

_arq_pool = None


async def get_arq_pool():
    """FastAPI dependency — returns a shared ARQ Redis pool."""
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    return _arq_pool
