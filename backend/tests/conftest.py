"""Pytest fixtures shared across all backend tests."""
from __future__ import annotations

from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from backend.main import create_app

# ---------------------------------------------------------------------------
# App / HTTP client fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def app():
    """Create a single FastAPI app instance for the whole test session."""
    return create_app()


@pytest.fixture()
def client(app):
    """Synchronous TestClient — suitable for simple endpoint smoke tests."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest_asyncio.fixture()
async def async_client(app) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client for tests that need await semantics."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Infrastructure mocks
# ---------------------------------------------------------------------------


@pytest.fixture()
def mock_db():
    """Return a minimal async-mock that satisfies the get_db dependency."""
    session = AsyncMock()
    session.execute = AsyncMock(return_value=MagicMock())
    return session


@pytest.fixture()
def mock_redis():
    """Return a minimal async-mock that satisfies the get_redis dependency."""
    redis = AsyncMock()
    redis.ping = AsyncMock(return_value=True)
    redis.get = AsyncMock(return_value=None)
    redis.setex = AsyncMock()
    redis.incr = AsyncMock(return_value=1)
    redis.expire = AsyncMock()
    return redis
