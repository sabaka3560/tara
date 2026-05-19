"""Tests for the /health liveness endpoint."""
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import create_app

STATUS_OK = "ok"
VERSION = "0.1.0"


@pytest.fixture(scope="module")
def client():
    app = create_app()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_health_endpoint(client: TestClient) -> None:
    """GET /health must return 200 with status == 'ok'."""
    with (
        patch(
            "backend.main.check_db_connection",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch(
            "backend.main.check_redis_connection",
            new_callable=AsyncMock,
            return_value=True,
        ),
    ):
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == STATUS_OK
    assert body["db"] == "connected"
    assert body["redis"] == "connected"
    assert body["version"] == VERSION
