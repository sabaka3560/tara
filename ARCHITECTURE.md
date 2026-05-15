# ARCHITECTURE.md — AI Wardrobe OS

## Product Vision

A free, Instagram-feel wardrobe app for Indian women. AI catalogs your clothes from photos, builds outfits, tells you what to buy next. Monetized through affiliate links and ads — not subscriptions. Fun, fast, visual. Built for a phone in portrait mode. Feels like a fashion feed, not a spreadsheet.

---

## UI Direction — 2026 Instagram Standard

### Core Feel
- **Full-bleed cards**, no white space waste
- **Swipe-native** — swipe left/right for outfits, tap to inspect, long-press for actions
- **Instant feedback** — every tap has a micro-animation (15–25% conversion lift proven)
- **Bottom-sheet everything** — no jarring full-screen modals
- **Dark mode first** — fashion apps look better dark; light mode is an option
- **Haptic feedback** on every meaningful interaction

### UI Tech Stack
```
Framework:      React Native 0.74+ with New Architecture (Fabric)
Animations:     Reanimated 4 (CSS animation support, Worklets off JS thread)
GPU Rendering:  React Native Skia (shapes, gradients, blurs — GPU-direct)
Gestures:       React Native Gesture Handler 2
Navigation:     Expo Router (file-based, like Next.js)
UI Components:  Gluestack UI v2 (accessible, themeable, RN + web)
Images:         Expo Image (faster than RN Image, blurhash placeholders)
Camera:         React Native Vision Camera v4
Icons:          Lucide React Native
Fonts:          Inter (body) + Playfair Display (headings — fashion feel)
```

### Key Screens
```
1. Wardrobe Feed     — masonry grid of your clothes, Instagram-style
2. Outfit Builder    — swipeable outfit cards (Tinder-style swipe = like)
3. Upload Flow       — camera → crop → AI tagging → save (< 10s)
4. Shop Tab          — affiliate recommendations that look like editorial content
5. Style Profile     — body type, color season, style aesthetic quiz
6. Occasion Planner  — "I have a wedding Saturday" → outfit suggestions
```

### Animation Patterns
```javascript
// Every card entrance — spring physics
const enterAnim = useAnimatedStyle(() => ({
  transform: [
    { translateY: withSpring(0, { damping: 15, stiffness: 120 }) },
    { scale: withSpring(1) }
  ],
  opacity: withTiming(1, { duration: 300 })
}));

// Outfit swipe — Tinder-like
const swipeGesture = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = e.translationX;
    rotate.value = interpolate(e.translationX, [-200, 200], [-15, 15]);
  })
  .onEnd((e) => {
    if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
      translateX.value = withSpring(e.translationX > 0 ? 500 : -500);
      runOnJS(handleSwipe)(e.translationX > 0 ? 'like' : 'skip');
    } else {
      translateX.value = withSpring(0);
    }
  });
```

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   React Native App                       │
│  Vision Camera → Upload → Outfit Feed → Shop → Profile  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS + WebSocket
┌────────────────────────▼────────────────────────────────┐
│                  FastAPI Backend                          │
│                                                          │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────┐  │
│  │  API Router  │  │  Auth (JWT)    │  │  Rate Limit │  │
│  └──────┬───────┘  └───────┬────────┘  └──────┬──────┘  │
│         │                  │ (Redis)            │         │
│  ┌──────▼───────────────────────────────────── ▼──────┐  │
│  │              Service Layer                          │  │
│  │  ClassifierService  OutfitAgent  ShopService       │  │
│  └──────┬──────────────┬───────────────┬─────────────┘  │
│         │              │               │                  │
│  ┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼─────┐           │
│  │Gemini Vision│ │ LangGraph  │ │  SerpApi  │           │
│  │  (classify) │ │  (agent)   │ │ + Myntra  │           │
│  └─────────────┘ └─────┬──────┘ └───────────┘           │
│                         │ PostgresSaver                    │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    Supabase                              │
│   Postgres + pgvector + Auth + Storage + Realtime       │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                     Redis                                │
│   Rate limiting · Session cache · Agent state · TTL     │
└─────────────────────────────────────────────────────────┘
```

---

## Backend — FastAPI

### Project Structure
```
backend/
├── main.py                   # App factory, middleware registration
├── core/
│   ├── config.py             # Settings via pydantic-settings
│   ├── security.py           # JWT, password hashing
│   ├── database.py           # Async SQLAlchemy + Supabase client
│   └── redis.py              # Redis pool singleton
├── api/
│   ├── deps.py               # Shared FastAPI dependencies
│   ├── v1/
│   │   ├── wardrobe.py       # POST /upload, GET /items, DELETE /item
│   │   ├── outfits.py        # GET /suggest, POST /save, GET /history
│   │   ├── shop.py           # GET /recommendations, GET /search
│   │   └── profile.py        # GET/PUT /style-profile
├── services/
│   ├── classifier.py         # Gemini Vision → structured clothing data
│   ├── outfit_agent.py       # LangGraph outfit suggestion agent
│   ├── shop_service.py       # SerpApi + affiliate link builder
│   ├── embedding_service.py  # text-embedding-004 for pgvector
│   └── cache_service.py      # Unified cache abstraction (L1 + L2)
├── models/
│   ├── clothing_item.py      # SQLAlchemy ORM model
│   ├── outfit.py
│   └── user_profile.py
├── schemas/
│   ├── clothing.py           # Pydantic request/response schemas
│   ├── outfit.py
│   └── shop.py
├── workers/
│   ├── arq_worker.py         # ARQ (Async Redis Queue) worker
│   └── tasks/
│       ├── classify_task.py  # Background: classify uploaded image
│       └── embed_task.py     # Background: generate + store embeddings
└── tests/
    ├── test_classifier.py
    ├── test_outfit_agent.py
    └── test_shop_service.py
```

### Core Patterns

**1. Settings — single source of truth**
```python
# core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    gemini_api_key: str
    anthropic_api_key: str
    supabase_url: str
    supabase_service_key: str
    redis_url: str
    serpapi_key: str
    jwt_secret: str
    environment: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
```

**2. Async DB — never block the event loop**
```python
# core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(settings.supabase_db_url, pool_size=10, max_overflow=20)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

**3. Generic CRUD base — reuse across all models**
```python
# services/base.py
from typing import Generic, TypeVar, Type
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")

class CRUDBase(Generic[ModelType, CreateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: str) -> ModelType | None:
        result = await db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_by_user(self, db: AsyncSession, user_id: str) -> list[ModelType]:
        result = await db.execute(
            select(self.model).where(self.model.user_id == user_id)
        )
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj_in: CreateSchemaType) -> ModelType:
        db_obj = self.model(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, id: str) -> None:
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
```

**4. Background tasks — never make user wait for AI**
```python
# api/v1/wardrobe.py
from arq import create_pool
from workers.tasks.classify_task import classify_clothing_task

@router.post("/upload")
async def upload_clothing(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis)
):
    # 1. Save raw image to Supabase Storage immediately
    image_url = await storage.upload(file, user_id=current_user.id)

    # 2. Create pending item in DB
    item = await crud_clothing.create(db, ClothingItemCreate(
        user_id=current_user.id,
        image_url=image_url,
        status="processing"   # shows spinner in UI
    ))

    # 3. Enqueue background classification — user gets instant response
    pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    await pool.enqueue_job("classify_clothing_task", item.id, image_url)

    return {"item_id": item.id, "status": "processing"}
    # Frontend subscribes to Supabase Realtime for status update
```

---

## Caching Strategy — 3 Layers

### Layer 1: In-Process Memory Cache (L1)
For data that never changes per request (model configs, system prompts).
```python
from async_lru import alru_cache

@alru_cache(maxsize=128)
async def get_style_system_prompt() -> str:
    # Loaded once, cached in memory forever for the process lifetime
    return await load_prompt_from_file("prompts/outfit_system.txt")
```

### Layer 2: Redis Cache (L2)
For per-user data that changes occasionally.
```python
# services/cache_service.py
import json
from redis.asyncio import Redis
from typing import Any, Callable, TypeVar

T = TypeVar("T")

class CacheService:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def get_or_set(
        self,
        key: str,
        fetch_fn: Callable[[], Any],
        ttl_seconds: int = 3600
    ) -> Any:
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        value = await fetch_fn()
        await self.redis.setex(key, ttl_seconds, json.dumps(value))
        return value

    async def invalidate(self, pattern: str) -> None:
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)

# Usage
async def get_user_wardrobe(user_id: str, cache: CacheService, db: AsyncSession):
    return await cache.get_or_set(
        key=f"wardrobe:{user_id}",
        fetch_fn=lambda: crud_clothing.get_by_user(db, user_id),
        ttl_seconds=300  # 5 min — refresh after new upload
    )
```

### Layer 3: AI Prompt Caching (Anthropic)
**The biggest cost lever.** Saves 90% on repeated system prompts.

```python
# services/outfit_agent.py
from anthropic import AsyncAnthropic

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

# SYSTEM PROMPT — static, cache this forever
# Rule: put cache_control at the end of all static content
OUTFIT_SYSTEM_PROMPT = """
You are a personal stylist AI for Indian women...
[entire system prompt — can be 2000+ tokens]
[Indian occasion guide, color theory, garment types...]
"""

async def suggest_outfit(wardrobe_items: list[dict], occasion: str, weather: str):
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",  # cheapest text model
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": OUTFIT_SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"}  # cache for 5 min
                # After 1st call: 90% cheaper on every subsequent call
            }
        ],
        messages=[
            {
                "role": "user",
                "content": f"""
                Wardrobe: {json.dumps(wardrobe_items)}
                Occasion: {occasion}
                Weather: {weather}
                Suggest 3 outfits. Return JSON array only.
                """
            }
        ]
    )
    return json.loads(response.content[0].text)
```

**Cost impact with prompt caching:**
```
Without caching: 2000 tokens × $0.80/MTok × 1000 calls/day = $1.60/day
With caching:    2000 tokens × $0.08/MTok × 999 calls + $0.80 = $0.16/day
Saving: 90% — $432/year per 1000 daily active users
```

### Cache TTL Reference
| Data | Cache Layer | TTL |
|---|---|---|
| System prompts | Anthropic (server-side) | 5 min (auto-refresh) |
| User wardrobe list | Redis | 5 min |
| Outfit suggestions | Redis | 1 hour |
| Shop recommendations | Redis | 6 hours |
| Style profile | Redis | 24 hours |
| Clothing item data | Redis | permanent (invalidate on edit) |
| Rate limit counters | Redis | 1 min sliding window |
| Embedding vectors | pgvector (DB) | permanent |

---

## AI Pipeline — Clothing Classification

### Flow
```
Upload → Compress → ML Kit pre-filter → Gemini Vision → JSON → Embed → Store
```

### Gemini Vision Service
```python
# services/classifier.py
import google.generativeai as genai
from PIL import Image
import io, json, base64

genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel("gemini-2.5-flash-lite")  # cheapest

CLASSIFY_PROMPT = """
Analyze this clothing item. Return ONLY valid JSON, no markdown, no explanation:
{
  "is_clothing": true,
  "type": "kurta|saree|lehenga|salwar|palazzo|jeans|dress|top|blazer|jacket|skirt|dupatta|other",
  "colors": ["primary", "secondary"],
  "pattern": "solid|printed|embroidered|checked|striped|floral|geometric|abstract",
  "fabric_guess": "cotton|silk|chiffon|georgette|denim|polyester|linen|velvet",
  "occasion": ["casual","office","festive","wedding","party","daily","sports"],
  "season": ["summer","winter","monsoon","all-season"],
  "style": "ethnic|western|indo-western|formal|streetwear",
  "fit": "fitted|loose|relaxed|oversized",
  "care_guess": "machine-wash|hand-wash|dry-clean"
}
If no clothing detected, return {"is_clothing": false}.
"""

def _compress(image_bytes: bytes, max_size: int = 512) -> bytes:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=82)
    return buf.getvalue()

async def classify_clothing(image_bytes: bytes) -> dict:
    compressed = _compress(image_bytes)
    b64 = base64.b64encode(compressed).decode()
    response = _model.generate_content([
        {"mime_type": "image/jpeg", "data": b64},
        CLASSIFY_PROMPT
    ])
    result = json.loads(response.text)
    if not result.get("is_clothing"):
        raise ValueError("No clothing detected in image")
    return result
```

### Outfit Agent — LangGraph
```python
# services/outfit_agent.py
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from typing import TypedDict, Annotated
import operator

class OutfitState(TypedDict):
    user_id: str
    occasion: str
    weather: str
    wardrobe: list[dict]          # all user's clothing items
    candidate_items: list[dict]   # filtered by occasion/season
    outfit_suggestions: list[dict]
    gap_analysis: dict
    shop_links: list[dict]
    error: str | None

# Node functions
async def filter_wardrobe(state: OutfitState) -> OutfitState:
    """Filter items by occasion and season — reduce tokens sent to LLM"""
    relevant = [
        item for item in state["wardrobe"]
        if state["occasion"] in item.get("occasion", [])
        or "all-season" in item.get("season", [])
    ]
    return {**state, "candidate_items": relevant[:40]}  # cap at 40 items

async def generate_outfits(state: OutfitState) -> OutfitState:
    """Claude Haiku — text only, cheap, prompt-cached system prompt"""
    suggestions = await suggest_outfit(
        state["candidate_items"], state["occasion"], state["weather"]
    )
    return {**state, "outfit_suggestions": suggestions}

async def analyze_gaps(state: OutfitState) -> OutfitState:
    """What's missing from this wardrobe for common occasions?"""
    gaps = await find_wardrobe_gaps(state["wardrobe"])
    return {**state, "gap_analysis": gaps}

async def fetch_shop_links(state: OutfitState) -> OutfitState:
    """Turn gap analysis into affiliate product links"""
    links = await shop_service.search_products(state["gap_analysis"])
    return {**state, "shop_links": links}

# Graph definition
def build_outfit_graph(checkpointer):
    graph = StateGraph(OutfitState)
    graph.add_node("filter", filter_wardrobe)
    graph.add_node("generate", generate_outfits)
    graph.add_node("gaps", analyze_gaps)
    graph.add_node("shop", fetch_shop_links)

    graph.set_entry_point("filter")
    graph.add_edge("filter", "generate")
    graph.add_edge("generate", "gaps")
    graph.add_edge("gaps", "shop")
    graph.add_edge("shop", END)

    # PostgresSaver — not SqliteSaver, which bottlenecks under concurrency
    return graph.compile(checkpointer=checkpointer)

# Production: resume if interrupted
async def get_outfit_suggestions(user_id: str, occasion: str, weather: str):
    async with AsyncPostgresSaver.from_conn_string(settings.supabase_db_url) as checkpointer:
        graph = build_outfit_graph(checkpointer)
        config = {"configurable": {"thread_id": f"outfit-{user_id}-{occasion}"}}
        result = await graph.ainvoke(
            {"user_id": user_id, "occasion": occasion, "weather": weather},
            config=config
        )
        return result
```

---

## Database Schema — Supabase + pgvector

```sql
-- Enable vector extension
create extension if not exists vector;

-- Users (managed by Supabase Auth, extended here)
create table profiles (
  id          uuid primary key references auth.users(id),
  display_name text,
  body_type   text,           -- hourglass|pear|apple|rectangle|inverted-triangle
  color_season text,          -- spring|summer|autumn|winter
  style_aesthetic text[],     -- ['ethnic','minimalist','maximalist']
  budget_range text,          -- 'budget'|'mid'|'premium'
  location    text,           -- for weather API
  created_at  timestamptz default now()
);

-- Clothing items
create table clothing_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade,
  image_url   text not null,
  status      text default 'processing',  -- processing|ready|error
  type        text,
  colors      text[],
  pattern     text,
  fabric_guess text,
  occasion    text[],
  season      text[],
  style       text,
  fit         text,
  embedding   vector(768),    -- for semantic outfit matching
  wear_count  int default 0,
  last_worn   date,
  created_at  timestamptz default now()
);

-- Vector index — critical for performance
create index on clothing_items
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RLS — users only see their own items
alter table clothing_items enable row level security;
create policy "users_own_items" on clothing_items
  using (auth.uid() = user_id);

-- Outfits
create table outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade,
  item_ids    uuid[],         -- clothing_items.id array
  occasion    text,
  ai_generated bool default true,
  liked       bool,
  created_at  timestamptz default now()
);

alter table outfits enable row level security;
create policy "users_own_outfits" on outfits
  using (auth.uid() = user_id);

-- Wear log
create table wear_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade,
  outfit_id   uuid references outfits(id),
  worn_date   date default current_date,
  occasion    text
);

-- Find semantically similar items (generic function)
create or replace function match_clothing(
  query_embedding vector(768),
  user_id_filter uuid,
  match_count int default 10,
  match_threshold float default 0.7
)
returns table (id uuid, similarity float)
language plpgsql as $$
begin
  return query
  select
    ci.id,
    1 - (ci.embedding <=> query_embedding) as similarity
  from clothing_items ci
  where ci.user_id = user_id_filter
    and ci.status = 'ready'
    and 1 - (ci.embedding <=> query_embedding) > match_threshold
  order by ci.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

---

## Generic / Reusable Functions

### 1. Resilient API caller — handles rate limits + retries
```python
# utils/api_client.py
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError))
)
async def resilient_get(url: str, params: dict, headers: dict) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        return resp.json()
```

### 2. Rate limiter — per user, Redis-backed
```python
# utils/rate_limiter.py
from redis.asyncio import Redis
from fastapi import HTTPException

async def check_rate_limit(redis: Redis, user_id: str, action: str, limit: int, window: int):
    key = f"ratelimit:{action}:{user_id}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, window)
    if count > limit:
        raise HTTPException(429, f"Too many {action} requests. Try again later.")
```

### 3. Image preprocessing — standardize before any API call
```python
# utils/image_utils.py
from PIL import Image, ExifTags
import io

def preprocess_image(raw_bytes: bytes, max_size: int = 512) -> bytes:
    img = Image.open(io.BytesIO(raw_bytes))

    # Fix EXIF rotation (phone photos often come sideways)
    try:
        exif = img._getexif()
        if exif:
            for tag, value in exif.items():
                if ExifTags.TAGS.get(tag) == 'Orientation':
                    rotations = {3: 180, 6: 270, 8: 90}
                    if value in rotations:
                        img = img.rotate(rotations[value], expand=True)
    except Exception:
        pass

    img = img.convert("RGB")
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=82, optimize=True)
    return buf.getvalue()
```

### 4. Streaming response — real-time outfit generation
```python
# api/v1/outfits.py
from fastapi.responses import StreamingResponse
import json

@router.get("/suggest/stream")
async def stream_outfit_suggestions(
    occasion: str,
    current_user: User = Depends(get_current_user)
):
    async def event_stream():
        async for chunk in outfit_agent.stream_suggestions(
            user_id=current_user.id, occasion=occasion
        ):
            yield f"data: {json.dumps(chunk)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

### 5. Affiliate link builder
```python
# services/shop_service.py
from urllib.parse import urlencode

AFFILIATE_CONFIGS = {
    "myntra": {
        "base_url": "https://www.myntra.com",
        "affiliate_param": "utm_source=yourapp&utm_medium=affiliate&aff_id=YOUR_ID"
    },
    "nykaa_fashion": {
        "base_url": "https://www.nykaafashion.com",
        "affiliate_param": "utm_source=yourapp&aff_id=YOUR_ID"
    }
}

def build_affiliate_url(platform: str, product_url: str) -> str:
    config = AFFILIATE_CONFIGS.get(platform)
    if not config:
        return product_url
    separator = "&" if "?" in product_url else "?"
    return f"{product_url}{separator}{config['affiliate_param']}"
```

---

## React Native — Key Patterns

### Wardrobe Grid (Masonry, Instagram-style)
```javascript
// components/WardrobeGrid.jsx
import { MasonryFlashList } from "@shopify/flash-list";
import { Image } from "expo-image";

export function WardrobeGrid({ items, onItemPress }) {
  return (
    <MasonryFlashList
      data={items}
      numColumns={2}
      renderItem={({ item }) => (
        <ClothingCard item={item} onPress={() => onItemPress(item)} />
      )}
      estimatedItemSize={200}
      showsVerticalScrollIndicator={false}
    />
  );
}

function ClothingCard({ item, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <Image
        source={{ uri: item.image_url }}
        placeholder={{ blurhash: item.blurhash }}  // instant placeholder
        style={styles.card}
        contentFit="cover"
        transition={200}
      />
      {item.status === "processing" && <ProcessingOverlay />}
    </Pressable>
  );
}
```

### Real-time Status Updates via Supabase
```javascript
// hooks/useItemStatus.js
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useItemStatus(itemId, onReady) {
  useEffect(() => {
    const channel = supabase
      .channel(`item-${itemId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'clothing_items',
        filter: `id=eq.${itemId}`
      }, (payload) => {
        if (payload.new.status === 'ready') {
          onReady(payload.new);  // update UI instantly, no polling
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [itemId]);
}
```

---

## Features — Full Product List

### MVP (Phase 1)
- [ ] Photo upload → AI clothing classification (Gemini Flash-Lite)
- [ ] Wardrobe grid view (masonry, infinite scroll)
- [ ] Basic outfit suggestions (3 items combined)
- [ ] Myntra + Nykaa affiliate links on all recommendations
- [ ] Rewarded ad (AdMob) before extra outfit unlocks
- [ ] Push notifications (Expo Notifications)

### Phase 2
- [ ] Occasion-aware outfit planning ("Diwali this Saturday")
- [ ] Weather-aware suggestions (OpenWeatherMap API, free tier)
- [ ] Wardrobe gap analysis + shop recommendations
- [ ] Wear tracking (log daily outfits)
- [ ] "Outfit of the day" share card (watermarked) for Instagram Stories
- [ ] Style profile quiz (body type, color season, aesthetic)

### Phase 3
- [ ] Style community feed (public wardrobe sharing, opt-in)
- [ ] Resale integration (link unworn items to OLX/Meesho)
- [ ] AI outfit calendar (plan a week of outfits)
- [ ] MCP server (expose wardrobe data to Claude/ChatGPT)
- [ ] Brand partnerships (curated brand collections in-app)

---

## Cost Model at Scale

| Component | 1K users | 10K users | 100K users |
|---|---|---|---|
| Gemini Flash-Lite (classify) | $2.40 | $24 | $240 |
| Claude Haiku (outfits, cached) | $4 | $40 | $400 |
| Redis (Upstash) | $0 (free) | $10 | $60 |
| Supabase | $0 (free) | $25 | $100 |
| SerpApi (shopping search) | $10 | $50 | $200 |
| **Total AI + Infra/mo** | **$16** | **$149** | **$1,000** |
| **Revenue (affiliate + ads)** | **₹15K** | **₹1.5L** | **₹15L** |

---

## Rate Limits

| Endpoint | Limit | Window |
|---|---|---|
| POST /upload | 20 images | per day per user |
| GET /suggest | 10 requests | per hour per user |
| GET /shop | 30 requests | per hour per user |
| All endpoints | 100 requests | per minute per IP |

---

## Environment Variables
```
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_DB_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
SERPAPI_KEY=
MYNTRA_AFFILIATE_ID=
NYKAA_AFFILIATE_ID=
JWT_SECRET=
ADMOB_APP_ID=
OPENWEATHER_API_KEY=
SENTRY_DSN=
ENVIRONMENT=production
```

---

## What NOT to Build (Scope Guard)

- No custom vision model — Gemini Flash-Lite is sufficient
- No real-time video try-on — too complex, save for v3
- No social following/feed until 10K users — premature
- No desktop web app — mobile only until PMF
- No multi-language — English + Hindi only at launch
- No payment processing — freemium is free, affiliate is passive
