# CONTRACTS.md — Tara Shared Interfaces
# READ-ONLY during parallel agent work. Only the orchestrator updates this.

## App Name: Tara
## Package ID: com.tara.wardrobe
## API Base: http://localhost:8000/api/v1 (dev) | https://api.tara.app/api/v1 (prod)

---

## API Contracts (Backend owns, Frontend consumes)

### Auth
```
POST /auth/signup     body: {email, password, name}  → {user, session}
POST /auth/signin     body: {email, password}         → {user, session}
POST /auth/signout    header: Bearer token            → 204
```

### Wardrobe
```
POST /wardrobe/upload   multipart: file              → {item_id: uuid, status: "processing"}
GET  /wardrobe/items    ?cursor=&limit=20            → {items: ClothingItem[], next_cursor}
GET  /wardrobe/items/:id                             → ClothingItem
DEL  /wardrobe/items/:id                             → 204
GET  /wardrobe/unworn   ?days=30                     → ClothingItem[]
```

### Outfits
```
GET  /outfits/suggest   ?occasion=&weather=          → {suggestions: OutfitSuggestion[]}
POST /outfits/save      body: {item_ids, occasion}   → Outfit
GET  /outfits/history   ?cursor=&limit=20            → {outfits: Outfit[], next_cursor}
```

### Shop
```
GET  /shop/recommendations                           → {products: Product[], gaps: Gap[]}
GET  /shop/search       ?q=&platform=myntra|nykaa    → Product[]
```

### Profile
```
GET  /profile/style                                  → StyleProfile
PUT  /profile/style     body: StyleProfile           → StyleProfile
POST /wear-log          body: {outfit_id, date}      → WearLog
```

---

## Shared Types

### ClothingItem
```typescript
type ClothingItem = {
  id: string
  user_id: string
  image_url: string
  blurhash: string
  status: 'processing' | 'ready' | 'error'
  type: GarmentType
  colors: string[]
  pattern: string
  fabric_guess: string
  occasion: Occasion[]
  season: Season[]
  style: StyleCategory
  fit: string
  wear_count: number
  last_worn: string | null
  created_at: string
}
```

### OutfitSuggestion
```typescript
type OutfitSuggestion = {
  id: string
  items: ClothingItem[]   // 2-4 items
  occasion: Occasion
  reason: string          // "Perfect for your office meeting — navy and white are professional"
  affiliate_products: Product[]  // gap fills
}
```

### Product (Affiliate)
```typescript
type Product = {
  id: string
  title: string
  price: number           // in INR
  image_url: string
  platform: 'myntra' | 'nykaa' | 'flipkart'
  affiliate_url: string   // deep link with affiliate params
  rating: number | null
}
```

### StyleProfile
```typescript
type StyleProfile = {
  body_type: 'hourglass' | 'pear' | 'apple' | 'rectangle' | 'inverted-triangle'
  color_season: 'spring' | 'summer' | 'autumn' | 'winter'
  style_aesthetic: StyleAesthetic[]
  budget_range: 'budget' | 'mid' | 'premium'
  location: string
}
```

---

## Enums (Use these exact strings everywhere)

```typescript
type GarmentType =
  'kurta' | 'saree' | 'lehenga' | 'salwar' | 'palazzo' |
  'jeans' | 'dress' | 'top' | 'blazer' | 'jacket' |
  'skirt' | 'dupatta' | 'other'

type Occasion =
  'casual' | 'office' | 'festive' | 'wedding' | 'party' | 'daily' | 'sports'

type Season = 'summer' | 'winter' | 'monsoon' | 'all-season'

type StyleCategory = 'ethnic' | 'western' | 'indo-western' | 'formal' | 'streetwear'

type StyleAesthetic =
  'minimalist' | 'maximalist' | 'ethnic' | 'western' | 'boho' | 'classic' | 'streetwear'
```

---

## DB Tables (agent-db owns, backend reads)

```
profiles          → id, display_name, body_type, color_season, ...
clothing_items    → id, user_id, image_url, status, type, colors[], ...
outfits           → id, user_id, item_ids[], occasion, liked
wear_logs         → id, user_id, outfit_id, worn_date, occasion
agent_progress    → id, user_id, thread_id, status, progress, message
```

Full schema in `supabase/migrations/001_initial.sql`

---

## File Ownership (Agents: do not cross these lines)

```
agent-db          owns: supabase/migrations/**, supabase/seed/**
agent-backend     owns: backend/** (except backend/services/classifier.py)
agent-ai          owns: backend/services/classifier.py, backend/workers/**
agent-frontend    owns: app/**, components/**, hooks/**, lib/**
```

---

## Environment Variables (All agents assume these exist)

```
GEMINI_API_KEY
ANTHROPIC_API_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
SUPABASE_DB_URL
REDIS_URL
SERPAPI_KEY
MYNTRA_AFFILIATE_ID
NYKAA_AFFILIATE_ID
ADMOB_APP_ID
OPENWEATHER_API_KEY
```
