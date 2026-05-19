-- Migration: 003_products.sql
-- Product catalog for recommendation engine

create table products (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  description          text not null,       -- rich text used for embedding
  category             text not null,       -- ethnic/western/indo-western/formal/streetwear
  garment_type         text not null,       -- kurta/saree/lehenga/blazer/dress/etc
  occasions            text[] default '{}',
  colors               text[] default '{}',
  price_inr            integer not null,
  original_price_inr   integer,
  platform             text not null,       -- myntra/nykaa/flipkart
  affiliate_url        text not null,
  image_url            text not null,
  rating               numeric(2,1),
  embedding            vector(768),
  active               boolean default true,
  created_at           timestamptz default now()
);

-- IVFFlat index for cosine similarity search (catalog-wide, no user filter)
create index on products
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- Partial index for active products filter
create index on products (active, category, price_inr);

-- match_products: vector similarity + optional attribute pre-filters
create or replace function match_products(
  query_embedding      vector(768),
  match_count          int       default 20,
  filter_category      text      default null,
  filter_occasions     text[]    default null,
  max_price_inr        integer   default null,
  min_price_inr        integer   default null
)
returns table(
  id                   uuid,
  title                text,
  description          text,
  category             text,
  garment_type         text,
  occasions            text[],
  colors               text[],
  price_inr            integer,
  original_price_inr   integer,
  platform             text,
  affiliate_url        text,
  image_url            text,
  rating               numeric,
  similarity           float
)
language sql stable
as $$
  select
    p.id,
    p.title,
    p.description,
    p.category,
    p.garment_type,
    p.occasions,
    p.colors,
    p.price_inr,
    p.original_price_inr,
    p.platform,
    p.affiliate_url,
    p.image_url,
    p.rating,
    1 - (p.embedding <=> query_embedding) as similarity
  from products p
  where
    p.active = true
    and p.embedding is not null
    and (filter_category is null or p.category = filter_category)
    and (filter_occasions is null or p.occasions && filter_occasions)
    and (max_price_inr is null or p.price_inr <= max_price_inr)
    and (min_price_inr is null or p.price_inr >= min_price_inr)
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- browse_products: attribute-only (cold start / no wardrobe embeddings)
create or replace function browse_products(
  filter_category      text      default null,
  filter_styles        text[]    default null,
  filter_occasions     text[]    default null,
  max_price_inr        integer   default null,
  min_price_inr        integer   default null,
  match_count          int       default 20
)
returns table(
  id                   uuid,
  title                text,
  description          text,
  category             text,
  garment_type         text,
  occasions            text[],
  colors               text[],
  price_inr            integer,
  original_price_inr   integer,
  platform             text,
  affiliate_url        text,
  image_url            text,
  rating               numeric
)
language sql stable
as $$
  select
    p.id,
    p.title,
    p.description,
    p.category,
    p.garment_type,
    p.occasions,
    p.colors,
    p.price_inr,
    p.original_price_inr,
    p.platform,
    p.affiliate_url,
    p.image_url,
    p.rating
  from products p
  where
    p.active = true
    and (filter_category is null or p.category = filter_category)
    and (filter_styles is null or p.category = any(filter_styles))
    and (filter_occasions is null or p.occasions && filter_occasions)
    and (max_price_inr is null or p.price_inr <= max_price_inr)
    and (min_price_inr is null or p.price_inr >= min_price_inr)
  order by p.rating desc nulls last
  limit match_count;
$$;
