"""Sliding-window rate limiter backed by Redis."""
from fastapi import HTTPException, status
from redis.asyncio import Redis

RATE_LIMIT_EXCEEDED_MSG = "Rate limit exceeded — try again later."


async def check_rate_limit(
    redis: Redis,
    user_id: str,
    action: str,
    limit: int,
    window: int,
) -> None:
    """Raise HTTP 429 if *user_id* has exceeded *limit* calls for *action*
    within the last *window* seconds.
    """
    key = f"rl:{action}:{user_id}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, window)
    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=RATE_LIMIT_EXCEEDED_MSG,
        )
