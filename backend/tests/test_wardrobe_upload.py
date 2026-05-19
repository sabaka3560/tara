"""Async tests for wardrobe upload, list, and delete endpoints."""
from __future__ import annotations

import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from backend.main import app
from backend.core.database import get_db
from backend.core.redis import get_redis
from backend.core.security import get_current_user
from backend.core.arq_pool import get_arq_pool

FAKE_USER_ID = "00000000-0000-0000-0000-000000000001"
FAKE_TOKEN_PAYLOAD = {"sub": FAKE_USER_ID}
TEST_BASE_URL = "http://test"
SMALL_IMAGE = b"fakeimagebytes"
LARGE_IMAGE = b"x" * (10 * 1024 * 1024 + 1)


def _make_db_mock() -> AsyncMock:
    mock = AsyncMock()
    mock.execute = AsyncMock(return_value=MagicMock(first=MagicMock(return_value=None), mappings=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))))
    mock.commit = AsyncMock()
    return mock


def _make_redis_mock() -> AsyncMock:
    mock = AsyncMock()
    mock.incr = AsyncMock(return_value=1)
    mock.expire = AsyncMock()
    return mock


def _make_arq_mock() -> AsyncMock:
    mock = AsyncMock()
    mock.enqueue_job = AsyncMock()
    return mock


def _override_deps(db=None, redis=None, arq=None):
    db_mock = db or _make_db_mock()
    redis_mock = redis or _make_redis_mock()
    arq_mock = arq or _make_arq_mock()
    app.dependency_overrides[get_db] = lambda: db_mock
    app.dependency_overrides[get_redis] = lambda: redis_mock
    app.dependency_overrides[get_current_user] = lambda: FAKE_TOKEN_PAYLOAD
    app.dependency_overrides[get_arq_pool] = lambda: arq_mock
    return db_mock, redis_mock, arq_mock


def _clear_overrides():
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_upload_enqueues_job():
    """A valid upload returns 202, inserts into DB, and enqueues the classify task."""
    db_mock, redis_mock, arq_mock = _override_deps()

    with patch("backend.services.storage_service.upload_image", new=AsyncMock(return_value="https://example.com/img.jpg")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url=TEST_BASE_URL) as client:
            response = await client.post(
                "/api/v1/wardrobe/upload",
                files={"file": ("test.jpg", io.BytesIO(SMALL_IMAGE), "image/jpeg")},
                headers={"Authorization": "Bearer faketoken"},
            )

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "processing"
    assert "item_id" in body
    arq_mock.enqueue_job.assert_awaited_once()
    call_args = arq_mock.enqueue_job.call_args
    assert call_args[0][0] == "classify_clothing_task"

    _clear_overrides()


@pytest.mark.asyncio
async def test_upload_rate_limit():
    """The 21st upload within the window returns HTTP 429."""
    redis_mock = AsyncMock()
    redis_mock.incr = AsyncMock(return_value=21)
    redis_mock.expire = AsyncMock()
    _override_deps(redis=redis_mock)

    with patch("backend.services.storage_service.upload_image", new=AsyncMock(return_value="https://example.com/img.jpg")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url=TEST_BASE_URL) as client:
            response = await client.post(
                "/api/v1/wardrobe/upload",
                files={"file": ("test.jpg", io.BytesIO(SMALL_IMAGE), "image/jpeg")},
                headers={"Authorization": "Bearer faketoken"},
            )

    assert response.status_code == 429
    _clear_overrides()


@pytest.mark.asyncio
async def test_list_items_empty():
    """GET /wardrobe/items returns empty items list and null cursor for a new user."""
    _override_deps()

    async with AsyncClient(transport=ASGITransport(app=app), base_url=TEST_BASE_URL) as client:
        response = await client.get(
            "/api/v1/wardrobe/items",
            headers={"Authorization": "Bearer faketoken"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["next_cursor"] is None

    _clear_overrides()


@pytest.mark.asyncio
async def test_delete_item_not_found():
    """DELETE on a non-existent item returns 404."""
    db_mock = AsyncMock()
    row_mock = MagicMock()
    row_mock.first = MagicMock(return_value=None)
    db_mock.execute = AsyncMock(return_value=row_mock)
    db_mock.commit = AsyncMock()
    _override_deps(db=db_mock)

    async with AsyncClient(transport=ASGITransport(app=app), base_url=TEST_BASE_URL) as client:
        response = await client.delete(
            "/api/v1/wardrobe/items/nonexistent-id",
            headers={"Authorization": "Bearer faketoken"},
        )

    assert response.status_code == 404
    _clear_overrides()
