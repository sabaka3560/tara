"""Integration test: POST /wardrobe/upload → ARQ enqueue → classify_clothing_task → DB ready.

This module verifies the contracts between the FastAPI upload endpoint and the
AI classification worker. External services (Gemini, Supabase Storage, Redis/ARQ)
are mocked; real DB + Redis are required for these tests to run end-to-end.

Marked skip globally — will be activated in Phase 4 when CI infra is available.
"""
from __future__ import annotations

import pytest

pytestmark = pytest.mark.skip(reason="requires real Supabase + Redis")


@pytest.mark.asyncio
async def test_upload_triggers_classification() -> None:
    """Uploading an image enqueues a job that, when run, marks item as ready.

    Steps:
    1. Create a minimal fake JPEG in memory.
    2. POST to /wardrobe/upload (mock: storage upload, ARQ enqueue).
    3. Assert item created with status='processing'.
    4. Call classify_clothing_task() directly with the returned item_id.
    5. Assert item status transitions to 'ready' in the DB.
    """
    pass  # Stub — fill in Phase 4 when Supabase test project is provisioned


@pytest.mark.asyncio
async def test_classify_error_marks_item_error() -> None:
    """When Gemini vision fails, the clothing item status must be set to 'error'.

    Steps:
    1. Insert a clothing_items row with status='processing'.
    2. Call classify_clothing_task() with classify_clothing patched to raise.
    3. Assert item status is 'error' in the DB.
    """
    pass  # Stub — fill in Phase 4
