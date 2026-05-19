# Agent: DB
# Branch: agent-db
# Owns: supabase/migrations/**, supabase/seed/**
# Phase: 0

## Status: COMPLETE

## Phase 0 Checklist
- [x] Supabase project created (tara-prod)
- [x] 001_initial.sql migration written + tested
- [x] RLS policies on all tables
- [x] pgvector extension enabled
- [x] IVFFlat index on clothing_items.embedding
- [x] Seed: 3 users, 10 clothing items

## Blocked By
Nothing — can start immediately.

## Decisions Log
- profiles.id references auth.users(id) directly (not gen_random_uuid) so Supabase Auth is the source of truth
- match_clothing() uses cosine distance (1 - <=> operator) with match_threshold filter before limit
- IVFFlat lists=100 chosen for expected wardrobe sizes (~hundreds to low thousands of items per user)
- RLS policy names scoped with table prefix to ensure uniqueness across all tables
- 002_triggers.sql kept separate from 001_initial.sql to stay under 200-line limit
- Seed item UUIDs use 10000000-* prefix for easy identification in tests
- Outfit UUIDs use 20000000-* prefix
