# GUARDRAILS.md — Tara Clean Code Standards

## The Single Rule
> Before writing any code, read this file. Every function, file, and PR is measured against these standards. Verbose code that works is worse than clean code that works. Ponder the design for 30 seconds before typing.

---

## File Structure Rules

```
Max file length:        200 lines  (split if longer)
Max function length:    30 lines   (extract if longer)
Max nesting depth:      3 levels   (flatten with early returns)
Max function params:    4          (use a dataclass/schema beyond 4)
Max import lines:       15         (if more, split the file)
```

**Violation = block the PR. No exceptions.**

---

## Python (Backend) Guardrails

### DO
```python
# Early returns over nesting
async def get_item(db, user_id: str, item_id: str) -> ClothingItem:
    item = await crud.get(db, item_id)
    if not item:
        raise HTTPException(404)
    if item.user_id != user_id:
        raise HTTPException(403)
    return item

# Constants over magic values
MAX_UPLOAD_SIZE_MB = 10
SUPPORTED_FORMATS = {"image/jpeg", "image/png", "image/heic"}
CLASSIFICATION_IMG_SIZE = 512

# Type everything
async def classify(image_bytes: bytes) -> ClothingClassification:
    ...

# One thing per function
def compress_image(raw: bytes, max_px: int = 512) -> bytes: ...
def fix_exif_rotation(img: Image) -> Image: ...
def encode_b64(data: bytes) -> str: ...
# NOT: def compress_fix_and_encode(raw: bytes) -> str: ...
```

### DON'T
```python
# No bare except
try:
    result = json.loads(text)
except:           # catches SystemExit, KeyboardInterrupt — NEVER
    result = {}

# No mutable defaults
def build_tags(items=[]):  # list is shared across all calls
    ...

# No positional-only calls when meaning is unclear
classify(image, 512, True, "jpeg", 3)   # what do these mean?
classify(image, max_size=512, quality=85, retries=3)  # clear

# No string literals repeated twice — use constants
if item.status == "processing":  # define STATUS_PROCESSING = "processing"
    ...
if item.status == "processing":  # same magic string, second place
    ...
```

### Error Handling — Boundaries Only
```python
# ONLY validate at system boundaries (API endpoints, external calls)
@router.post("/upload")
async def upload(file: UploadFile):
    if file.content_type not in SUPPORTED_FORMATS:
        raise HTTPException(415, "Unsupported format")
    if file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, "File too large")
    # Internal functions trust their inputs — no re-validation inside

# External API calls — always handle failure
try:
    result = await gemini_classify(image_bytes)
except Exception as e:
    logger.error("classify_failed", item_id=item_id, error=str(e))
    await crud.update_status(db, item_id, "error")
    return  # don't re-raise — this is a background task
```

---

## TypeScript / React Native Guardrails

### DO
```typescript
// Type props always
type ClothingCardProps = {
  item: ClothingItem
  onPress: (item: ClothingItem) => void
}

// Destructure at the top
function ClothingCard({ item, onPress }: ClothingCardProps) {
  const { image_url, status, type } = item
  ...
}

// Derived state over useEffect
// BAD: useEffect to sync state
// GOOD:
const isProcessing = item.status === 'processing'
const displayName = GARMENT_LABELS[item.type] ?? item.type

// Extract hooks for logic
function useWardrobeItems(userId: string) { ... }
function useOutfitSuggestions(occasion: string) { ... }
// Components only render — logic lives in hooks
```

### DON'T
```typescript
// No inline styles (use StyleSheet)
<View style={{ marginTop: 16, padding: 8 }}>  // BAD
<View style={styles.card}>                     // GOOD

// No anonymous functions in JSX renders (re-created every render)
items.map(item => <Card onPress={() => handlePress(item)} />)  // BAD
items.map(item => <Card onPress={handlePressItem} item={item} />)  // GOOD

// No nested ternaries
const label = a ? b ? 'x' : 'y' : 'z'  // unreadable
// Use if/else or a lookup map

// No useEffect for data fetching (use React Query / SWR)
useEffect(() => { fetchItems() }, [])  // BAD
const { data } = useQuery(['items'], fetchItems)  // GOOD
```

---

## Project Structure Rules

### Backend — one job per file
```
routes/       → HTTP contract only (validate input, call service, return output)
services/     → business logic only (no HTTP, no DB queries)
crud/         → DB queries only (no business logic)
models/       → SQLAlchemy ORM only (no methods)
schemas/      → Pydantic only (no logic)
workers/      → background tasks only (call services)
utils/        → pure functions only (no side effects, no DB, no HTTP)
```

**Cross-cutting is a bug.** A route that queries DB directly is a bug. A service that returns an HTTPException is a bug.

### Frontend — one job per folder
```
screens/      → layout + composition only (no logic, no API calls)
components/   → reusable UI only (no business logic, no direct API calls)
hooks/        → data fetching + state logic (no JSX)
lib/          → API client, Supabase client, constants
store/        → global state (Zustand) — minimal, only truly global state
```

---

## Naming Conventions

### Python
```python
# Files: snake_case
classifier.py, outfit_agent.py, cache_service.py

# Classes: PascalCase
class ClothingItem, class OutfitState, class CacheService

# Functions/vars: snake_case
async def classify_clothing(), wardrobe_items, user_id

# Constants: UPPER_SNAKE
MAX_ITEMS = 200, GEMINI_MODEL = "gemini-2.5-flash-lite"

# Private helpers: _leading_underscore
def _compress_image(), def _fix_exif()
```

### TypeScript/React Native
```typescript
// Files: kebab-case for screens/components
wardrobe-grid.tsx, clothing-card.tsx, use-wardrobe.ts

// Components: PascalCase
WardrobeGrid, ClothingCard, OutfitBuilder

// Hooks: useXxx
useWardrobeItems, useOutfitSuggestions, useAgentProgress

// Constants: UPPER_SNAKE
MAX_UPLOAD_SIZE, SWIPE_THRESHOLD, ANIMATION_DURATION

// Types/Interfaces: PascalCase, no I prefix
type ClothingItem, type OutfitSuggestion, type UserProfile
```

---

## Generic Helper Functions — Use These, Don't Rewrite

### Python
```python
# utils/helpers.py — import these everywhere

from async_lru import alru_cache
from tenacity import retry, stop_after_attempt, wait_exponential
import json, base64

# Safe JSON parse — never crash on bad LLM output
def safe_json(text: str, fallback: dict = {}) -> dict:
    try:
        return json.loads(text.strip().strip("```json").strip("```"))
    except Exception:
        return fallback

# Chunk a list — for batch processing
def chunks(lst: list, n: int):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

# Truncate text to token budget
def truncate_tokens(text: str, max_chars: int = 8000) -> str:
    return text[:max_chars] if len(text) > max_chars else text

# Build a cache key — consistent format
def cache_key(*parts: str) -> str:
    return ":".join(str(p) for p in parts)
# Usage: cache_key("wardrobe", user_id) → "wardrobe:abc123"

# Retry decorator — use on all external API calls
resilient = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=1, max=8),
    reraise=True
)
# Usage: @resilient above any external call
```

### TypeScript
```typescript
// lib/helpers.ts — import these everywhere

// Safe fetch with timeout
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

// Format Indian currency
export const formatINR = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN')}`

// Debounce — for search inputs
export function debounce<T extends (...args: any[]) => any>(
  fn: T, delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// Clamp a number
export const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max)

// Pluralise
export const plural = (count: number, word: string) =>
  `${count} ${word}${count !== 1 ? 's' : ''}`
// Usage: plural(3, 'item') → "3 items"
```

---

## AI Code Guardrails (Specific to Tara)

### Gemini calls — always
```python
# 1. Compress before calling
# 2. Catch JSON parse errors with safe_json()
# 3. Validate is_clothing before proceeding
# 4. Log token usage for cost monitoring
result = safe_json(response.text)
if not result.get("is_clothing"):
    raise ValueError("not_clothing")
```

### Claude calls — always
```python
# 1. System prompt in first message with cache_control
# 2. Haiku for all non-premium calls
# 3. Cap max_tokens — never leave it unbounded
# 4. Stream if response > 200 tokens
```

### Background tasks — always
```python
# 1. Log start + end with item_id
# 2. Update status to "error" on any exception (never leave "processing" forever)
# 3. Never re-raise inside an ARQ task — it kills the worker
# 4. Idempotent: re-running same task with same item_id must be safe
```

---

## What Gets You a PR Block

- Function > 30 lines → split it
- File > 200 lines → split it
- Magic string used twice → extract to constant
- `except:` with no exception type → fix it
- Inline style in React Native → use StyleSheet
- `useEffect` for data fetching → use React Query
- External API call without retry → add `@resilient`
- Claude call without `cache_control` on system prompt → add it
- Background task that can leave status = "processing" forever → add error handler
- Any route that directly queries the DB → move to CRUD layer
