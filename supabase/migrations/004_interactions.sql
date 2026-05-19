-- Migration: 004_interactions.sql
-- User interaction signals for the learning recommendation engine

-- Add preference vector to profiles (learned taste, updated on each interaction)
alter table profiles
  add column if not exists preference_vector          vector(768),
  add column if not exists preference_updated_at      timestamptz,
  add column if not exists preference_interaction_count int not null default 0;

-- Interaction event log — append-only, never updated
create table user_interactions (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references profiles(id) on delete cascade,
  product_id         text        not null,   -- catalog UUID or live-search hash
  product_title      text        not null,
  product_category   text        not null,
  product_platform   text        not null,
  product_image_url  text        not null,
  product_url        text        not null,
  interaction_type   text        not null
                     check (interaction_type in ('like','dislike','save','purchase')),
  created_at         timestamptz not null default now()
);

-- Index for per-user queries (feed history, analytics)
create index on user_interactions (user_id, created_at desc);
-- Index to detect duplicate interactions
create index on user_interactions (user_id, product_id, interaction_type);

-- RLS
alter table user_interactions enable row level security;

create policy "interactions_select_own"
  on user_interactions for select using (auth.uid() = user_id);
create policy "interactions_insert_own"
  on user_interactions for insert with check (auth.uid() = user_id);
-- No update/delete — interaction log is immutable

-- IVFFlat index on preference_vector for future user-to-user similarity
-- (sparse for now, will populate once users have interacted)
create index if not exists profiles_pref_vec_idx
  on profiles using ivfflat (preference_vector vector_cosine_ops)
  with (lists = 10);
