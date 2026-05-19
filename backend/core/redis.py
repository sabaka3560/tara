"""Redis connection pool, dependency, and health-check helper."""
from redis.asyncio import Redis
from typing import AsyncGenerator

from backend.core.config import settings

redis_pool: Redis = Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
)


async def get_redis() -> AsyncGenerator[Redis, None]:
    """FastAPI dependency — yields the shared Redis connection."""
    yield redis_pool


async def check_redis_connection() -> bool:
    """Return True if Redis is reachable; False otherwise."""
    try:
        return await redis_pool.ping()
    except Exception:
        return False
