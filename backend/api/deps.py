"""Centralised FastAPI dependency re-exports for all routes."""
from typing import Annotated, AsyncGenerator

from fastapi import Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.redis import get_redis
from backend.core.security import get_current_user
from backend.services.cache_service import CacheService

# Typed aliases for cleaner route signatures
DBDep = Annotated[AsyncSession, Depends(get_db)]
RedisDep = Annotated[Redis, Depends(get_redis)]
CurrentUserDep = Annotated[dict, Depends(get_current_user)]


async def get_cache_service(redis: RedisDep) -> AsyncGenerator[CacheService, None]:
    """FastAPI dependency — yields a CacheService bound to the request's Redis."""
    yield CacheService(redis)


CacheServiceDep = Annotated[CacheService, Depends(get_cache_service)]
