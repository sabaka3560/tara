"""Unit tests for classify_clothing_task ARQ worker."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.workers.tasks.classify_task import classify_clothing_task


def _mock_classification() -> MagicMock:
    return MagicMock(
        is_clothing=True,
        type=MagicMock(value="kurta"),
        colors=["red"],
        pattern="plain",
        fabric_guess="cotton",
        occasion=[MagicMock(value="casual")],
        season=[MagicMock(value="all-season")],
        style=MagicMock(value="ethnic"),
        fit="regular",
        care_guess="machine wash",
    )


@pytest.mark.asyncio
async def test_classify_task_success() -> None:
    """Happy path: DB execute and commit are called exactly once with STATUS_READY."""
    with (
        patch("backend.workers.tasks.classify_task.httpx.AsyncClient") as mock_client_cls,
        patch("backend.workers.tasks.classify_task.classify_clothing") as mock_classify,
        patch("backend.workers.tasks.classify_task.AsyncSessionLocal") as mock_session_cls,
        patch("backend.workers.tasks.classify_task.embed_item_task", new_callable=AsyncMock),
        patch("backend.workers.tasks.classify_task._broadcast_realtime", new_callable=AsyncMock),
    ):
        mock_resp = AsyncMock()
        mock_resp.content = b"fake_image_data"
        mock_resp.raise_for_status = MagicMock()
        mock_client_cls.return_value.__aenter__.return_value.get = AsyncMock(
            return_value=mock_resp
        )

        mock_classify.return_value = _mock_classification()

        mock_session = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session

        ctx: dict = {}
        result = await classify_clothing_task(ctx, "test-id", "http://example.com/img.jpg", "user-id")

        assert result is None
        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()

        call_params = mock_session.execute.call_args[0][1]
        assert call_params["status"] == "ready"


@pytest.mark.asyncio
async def test_classify_task_non_clothing() -> None:
    """When classify_clothing raises ValueError('does not contain'), status must be set to error."""
    with (
        patch("backend.workers.tasks.classify_task.httpx.AsyncClient") as mock_client_cls,
        patch("backend.workers.tasks.classify_task.classify_clothing") as mock_classify,
        patch("backend.workers.tasks.classify_task.AsyncSessionLocal") as mock_session_cls,
    ):
        mock_resp = AsyncMock()
        mock_resp.content = b"not_a_shirt.jpg"
        mock_resp.raise_for_status = MagicMock()
        mock_client_cls.return_value.__aenter__.return_value.get = AsyncMock(
            return_value=mock_resp
        )

        mock_classify.side_effect = ValueError("Image does not contain a clothing item")

        mock_session = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session

        ctx: dict = {}
        result = await classify_clothing_task(ctx, "item-2", "http://example.com/dog.jpg", "user-id")

        assert result is None
        mock_session.execute.assert_called_once()
        call_params = mock_session.execute.call_args[0][1]
        assert call_params["status"] == "error"


@pytest.mark.asyncio
async def test_classify_task_http_error() -> None:
    """When the image download raises httpx.HTTPError, the item must be marked error."""
    import httpx

    with (
        patch("backend.workers.tasks.classify_task.httpx.AsyncClient") as mock_client_cls,
        patch("backend.workers.tasks.classify_task.AsyncSessionLocal") as mock_session_cls,
    ):
        mock_client_cls.return_value.__aenter__.return_value.get = AsyncMock(
            side_effect=httpx.HTTPError("connection refused")
        )

        mock_session = AsyncMock()
        mock_session_cls.return_value.__aenter__.return_value = mock_session

        ctx: dict = {}
        result = await classify_clothing_task(ctx, "item-3", "http://bad-host/img.jpg", "user-id")

        assert result is None
        mock_session.execute.assert_called_once()
        call_params = mock_session.execute.call_args[0][1]
        assert call_params["status"] == "error"


@pytest.mark.asyncio
async def test_classify_task_never_raises() -> None:
    """No exception must propagate out of classify_clothing_task regardless of failure."""
    with (
        patch("backend.workers.tasks.classify_task.httpx.AsyncClient") as mock_client_cls,
        patch("backend.workers.tasks.classify_task.AsyncSessionLocal") as mock_session_cls,
    ):
        # Simulate an unexpected RuntimeError inside the client call
        mock_client_cls.return_value.__aenter__.return_value.get = AsyncMock(
            side_effect=RuntimeError("unexpected boom")
        )

        # DB error path also fails — ensures double-fault is silenced
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(side_effect=RuntimeError("db also dead"))
        mock_session_cls.return_value.__aenter__.return_value = mock_session

        ctx: dict = {}
        # Must not raise — ARQ worker must stay alive
        result = await classify_clothing_task(ctx, "item-4", "http://example.com/img.jpg", "user-id")
        assert result is None
