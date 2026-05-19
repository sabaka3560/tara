# Agent: Backend
# Branch: agent-backend
# Owns: backend/** (except backend/services/classifier.py)
# Phase: 1

## Status: COMPLETE

## Phase 0 Checklist
- [x] FastAPI project scaffolded
- [x] /health endpoint green
- [x] Async DB session connected to Supabase
- [x] Redis ping works
- [x] ARQ worker starts

## Phase 1 Checklist
- [x] `backend/models/clothing_item.py` — SQLAlchemy ORM model for `clothing_items` (pgvector optional)
- [x] `backend/services/storage_service.py` — Supabase Storage upload/delete via httpx
- [x] `backend/core/arq_pool.py` — lazy singleton ARQ pool, FastAPI dependency
- [x] `backend/api/v1/wardrobe.py` — POST /upload, GET /items, DELETE /items/{id} fully implemented
- [x] `backend/tests/test_wardrobe_upload.py` — 4 async tests with mocked deps

## Blocked By
Nothing. Phase 2 (outfit recommendations, search) needs agent-ai to complete classifier first.

## Decisions Log
- Used pydantic-settings BaseSettings with env_file=".env"; all vars optional with sensible defaults so the app boots in CI without a real .env.
- ARQ WorkerSettings uses try/except ImportError around the tasks/ imports so the worker config loads cleanly before agent-ai writes the task files.
- `backend/workers/tasks/` is left to agent-ai (CONTRACTS.md ownership). Stub `__init__.py` created so the package is importable.
- All files are under 200 lines and all functions under 30 lines (GUARDRAILS compliance).
- Repeated string literals extracted to module-level constants throughout.
- No bare `except` clauses — all exception handlers specify the exception type.
- Phase 1: ORM model uses `mapped_column` with SQLAlchemy 2.x Mapped types. pgvector column attached post-class-definition to avoid hard import failure.
- Phase 1: storage_service raises RuntimeError on non-2xx; caller decides whether to abort. DELETE is best-effort (error swallowed after DB record is gone).
- Phase 1: Cursor pagination encodes `created_at` as base64 ISO-8601; avoids exposing DB offsets. Fetches `limit+1` rows to detect next page.
- Phase 1: `get_current_user` returns the full JWT payload dict; `_user_id_from_payload` extracts `sub` and raises 401 cleanly if absent.
- Phase 1: Tests use `app.dependency_overrides` pattern so no real DB/Redis/ARQ connections are required.
