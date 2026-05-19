"""Redis-backed cache service with get-or-set, invalidation, and CRUD helpers."""
from __future__ import annotations

import json
from typing import Any, Callable, Awaitable

from redis.asyncio import Redis

DEFAULT_TTL = 3600


class CacheService:
    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    async def get(self, key: str) -> Any | None:
        """Return the cached value for *key*, or None if absent."""
        raw = await self._redis.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def set(self, key: str, value: Any, ttl_seconds: int = DEFAULT_TTL) -> None:
        """Store *value* as JSON under *key* with the given TTL."""
        await self._redis.setex(key, ttl_seconds, json.dumps(value))

    async def get_or_set(
        self,
        key: str,
        fetch_fn: Callable[[], Awaitable[Any]],
        ttl_seconds: int = DEFAULT_TTL,
    ) -> Any:
        """Return cached value; on miss call *fetch_fn*, cache, and return result."""
        cached = await self.get(key)
        if cached is not None:
            return cached
        value = await fetch_fn()
        await self.set(key, value, ttl_seconds)
        return value

    async def invalidate(self, pattern: str) -> None:
        """Delete all keys matching *pattern* (supports glob wildcards)."""
        keys = await self._redis.keys(pattern)
        if keys:
            await self._redis.delete(*keys)
