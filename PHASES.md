# PHASES.md — Tara Build Plan

## Rule: Never Start Next Phase Until Current Phase Passes All Tests

Each phase ends with a TEST GATE. All tests must pass, all checklist items must be ticked, before any agent touches Phase N+1. No exceptions.

---

## Phase 0 — Foundation (No AI, No UI)
**Goal:** Skeleton compiles, DB connects, env works, structure is correct.
**Who:** All agents in parallel — each sets up their own domain.

### Agent: DB
- [ ] Supabase project created, named `tara-prod`
- [ ] All migrations in `supabase/migrations/` run successfully
- [ ] RLS enabled and policies verified on all tables
- [ ] pgvector extension enabled
- [ ] IVFFlat index created on `clothing_items.embedding`
- [ ] Seed data: 3 test users, 10 clothing items

### Agent: Backend
- [ ] FastAPI project scaffolded, runs `uvicorn main:app`
- [ ] `/health` endpoint returns `{status: "ok", db: "connected"}`
- [ ] All env vars loaded via `pydantic-settings`
- [ ] Async DB session works (test query to Supabase)
- [ ] Redis connects (test `ping`)
- [ ] ARQ worker starts without errors

### Agent: Frontend
- [ ] Expo project created: `npx create-expo-app tara`
- [ ] Runs on Android emulator
- [ ] Supabase client connects (test auth)
- [ ] Expo Router navigation skeleton (tab layout)
- [ ] Reanimated 4 installed, test animation renders

### Agent: AI Pipeline
- [ ] Gemini API key works (test single classify call)
- [ ] Anthropic API key works (test single haiku call)
- [ ] `preprocess_image()` compresses correctly (512x512, <50KB output)
- [ ] Prompt caching verified (check `cache_creation_input_tokens` in response)

### Phase 0 Test Gate
```bash
# Backend
pytest tests/test_health.py          # DB + Redis connected
pytest tests/test_config.py          # All env vars present

# Frontend
npx expo start --android             # No crash on launch

# DB
supabase db test                     # All migrations pass
```
**Do not proceed to Phase 1 until all pass.**

---

## Phase 1 — Core Loop (Upload → Classify → Wardrobe Grid)
**Goal:** User can upload a photo, AI classifies it, sees it in wardrobe grid.
**This is the entire product value. Get this right before anything else.**

### Agent: Backend
- [ ] `POST /api/v1/wardrobe/upload` — saves image, enqueues ARQ job, returns `{item_id, status: "processing"}`
- [ ] ARQ worker: `classify_clothing_task` calls Gemini, writes result to DB, sets `status: "ready"`
- [ ] `GET /api/v1/wardrobe/items` — returns user's items, paginated (cursor-based, not offset)
- [ ] `DELETE /api/v1/wardrobe/items/{id}` — deletes item + image from storage
- [ ] Rate limit: 20 uploads/day per user enforced

### Agent: Frontend
- [ ] Camera screen: Vision Camera v4, capture + crop
- [ ] Upload flow: compress on-device → POST to backend → show spinner
- [ ] Supabase Realtime subscription: spinner → card when `status = "ready"`
- [ ] Wardrobe grid: MasonryFlashList, blurhash placeholders
- [ ] Pull-to-refresh works
- [ ] Empty state: "Upload your first outfit"

### Agent: AI Pipeline
- [ ] ML Kit pre-filter rejects non-clothing photos (test with 5 random photos)
- [ ] Gemini classifies all Indian garment types correctly (test set: kurta, saree, jeans, dress, blazer)
- [ ] EXIF rotation fixed before API call
- [ ] JSON parse never crashes (handle malformed Gemini output)
- [ ] Error path: `status: "error"` shown in UI with retry button

### Phase 1 Test Gate
```bash
# Backend unit tests
pytest tests/test_wardrobe_upload.py  # upload → enqueue → classify chain
pytest tests/test_classifier.py       # Gemini returns valid schema
pytest tests/test_arq_worker.py       # worker processes job end-to-end

# Integration test
pytest tests/integration/test_upload_flow.py
# Uploads real image → checks DB row → checks status becomes "ready"

# Frontend
# Manual: upload 10 photos (5 Indian garments, 5 non-clothing)
# Assert: 5 appear in grid, 5 show error
```
**Do not proceed to Phase 2 until all pass.**

---

## Phase 2 — Outfits + Shopping
**Goal:** AI suggests outfits, gaps detected, affiliate links shown.

### Agent: Backend
- [ ] `GET /api/v1/outfits/suggest?occasion=casual&weather=hot` — returns 3 outfits
- [ ] `POST /api/v1/outfits/save` — saves liked outfit
- [ ] `GET /api/v1/outfits/history` — paginated saved outfits
- [ ] `GET /api/v1/shop/recommendations` — gap analysis → affiliate products
- [ ] Prompt caching on outfit system prompt (verify 90%+ cache hit rate after warmup)
- [ ] Outfit agent: filter → generate → gaps → shop (LangGraph or sequential async)
- [ ] SerpApi search working with Indian fashion queries
- [ ] Affiliate URLs built correctly for Myntra + Nykaa

### Agent: Frontend
- [ ] Outfit Builder screen: swipeable cards (Tinder-style)
- [ ] Like/skip gesture with spring animation
- [ ] Occasion picker bottom sheet (casual, office, festive, wedding, party)
- [ ] Shop tab: product cards with affiliate deep links
- [ ] Rewarded ad gate before 4th outfit of the day
- [ ] Share card: "Outfit of the Day" with Tara watermark

### Phase 2 Test Gate
```bash
pytest tests/test_outfit_agent.py     # 3 valid outfits returned for each occasion
pytest tests/test_shop_service.py     # affiliate URLs valid, SerpApi returns results
pytest tests/test_prompt_cache.py     # cache_read_input_tokens > 0 on 2nd call

# Manual:
# - Swipe through 10 outfits, no crash
# - Tap shop link, opens Myntra correctly
# - Rewarded ad fires on 4th outfit request
```
**Do not proceed to Phase 3 until all pass.**

---

## Phase 3 — Profile + Monetization Polish
**Goal:** Style profile works, ads wired, share viral loop.

### Agent: Frontend
- [ ] Style profile quiz (body type, color season, aesthetic) — 5 screens
- [ ] Occasion planner: "I have a wedding Saturday" → calendar + outfit
- [ ] Wear log: tap to log today's outfit
- [ ] Unworn items highlight (items not worn in 30+ days)
- [ ] AdMob banner in shop tab (native ad format)
- [ ] Push notification: "You haven't planned tomorrow's outfit yet"
- [ ] Onboarding flow: 3 screens → style quiz → first upload

### Agent: Backend
- [ ] `GET/PUT /api/v1/profile/style` — style profile CRUD
- [ ] `POST /api/v1/wear-log` — log outfit worn
- [ ] `GET /api/v1/wardrobe/unworn` — items not worn in N days
- [ ] Weather integration: OpenWeatherMap free tier by user location
- [ ] Push notification trigger: daily 8pm if no outfit logged

### Phase 3 Test Gate
```bash
pytest tests/test_profile.py
pytest tests/test_wear_log.py
pytest tests/test_weather.py

# Manual:
# - Complete full onboarding on fresh install
# - Log outfit for 3 days, check wear count increments
# - Verify push notification fires (test device)
```

---

## Phase 4 — Scale + Hardening
**Goal:** 10K users without breaking. Observability. Cost optimised.

- [ ] Sentry error tracking on backend + frontend
- [ ] All N+1 queries eliminated (check Django debug toolbar equivalent)
- [ ] Redis cache hit rate >80% on wardrobe fetches
- [ ] Image CDN: Supabase Storage with transform (serve WebP, right size)
- [ ] Load test: 1000 concurrent uploads without queue backup
- [ ] Cost audit: actual spend vs model from ARCHITECTURE.md
- [ ] App Store / Play Store submission checklist complete

---

## Agent Assignment per Phase

| Phase | agent-db | agent-backend | agent-frontend | agent-ai |
|---|---|---|---|---|
| 0 | Schema + seed | Skeleton + health | Expo + nav | API key tests |
| 1 | — | Upload + worker | Camera + grid | Gemini pipeline |
| 2 | Outfit tables | Outfit API + shop | Outfit UI + ads | Prompt cache |
| 3 | Wear log tables | Profile + notifs | Quiz + planner | Weather |
| 4 | Indexes + perf | Load test + Sentry | Crash-free check | Cost audit |
