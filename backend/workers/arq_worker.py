"""ARQ worker settings — defines the background task queue configuration."""
from arq.connections import RedisSettings

from backend.core.config import settings

MAX_JOBS = 10
JOB_TIMEOUT = 120


def _build_redis_settings() -> RedisSettings:
    url = settings.REDIS_URL
    # RedisSettings.from_dsn handles redis:// URIs
    return RedisSettings.from_dsn(url)


class WorkerSettings:
    """ARQ worker configuration consumed by `arq` CLI entrypoint."""

    redis_settings = _build_redis_settings()
    max_jobs = MAX_JOBS
    job_timeout = JOB_TIMEOUT

    # AI agent owns tasks/ — import here so the worker registers them
    try:
        from backend.workers.tasks.classify import classify_clothing_task  # noqa: F401
        from backend.workers.tasks.embed_task import embed_item_task  # noqa: F401

        functions = [classify_clothing_task, embed_item_task]
    except ImportError:
        # Task modules created by agent-ai; fall back gracefully during scaffold
        functions = []
