-- Migration: 001_initial.sql
-- Enable pgvector extension
create extension if not exists vector;

-- Profiles table
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  body_type     text,
  color_season  text,
  style_aesthetic text[],
  budget_range  text,
  location      text,
  created_at    timestamptz default now()
);

-- Clothing items table
create table clothing_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  image_url   text,
  blurhash    text,
  status      text not null default 'processing',
  type        text,
  colors      text[],
  pattern     text,
  fabric_guess text,
  occasion    text[],
  season      text[],
  style       text,
  fit         text,
  care_guess  text,
  embedding   vector(768),
  wear_count  int not null default 0,
  last_worn   date,
  created_at  timestamptz default now()
);

-- Outfits table
create table outfits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  item_ids     uuid[],
  occasion     text,
  ai_generated bool not null default true,
  liked        bool,
  created_at   timestamptz default now()
);

-- Wear logs table
create table wear_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  outfit_id  uuid references outfits(id) on delete set null,
  worn_date  date not null default current_date,
  occasion   text,
  created_at timestamptz default now()
);

-- Agent progress table
create table agent_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  thread_id   text unique,
  agent_type  text,
  status      text not null default 'pending',
  progress    int not null default 0,
  message     text,
  result_ref  text,
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz default now()
);

-- IVFFlat index for fast vector similarity search
create index on clothing_items
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Enable RLS on all tables
alter table profiles       enable row level security;
alter table clothing_items enable row level security;
alter table outfits        enable row level security;
alter table wear_logs      enable row level security;
alter table agent_progress enable row level security;

-- RLS policies: profiles
create policy "profiles_own_profiles_select"
  on profiles for select using (auth.uid() = id);
create policy "profiles_own_profiles_insert"
  on profiles for insert with check (auth.uid() = id);
create policy "profiles_own_profiles_update"
  on profiles for update using (auth.uid() = id);
create policy "profiles_own_profiles_delete"
  on profiles for delete using (auth.uid() = id);

-- RLS policies: clothing_items
create policy "items_own_clothing_items_select"
  on clothing_items for select using (auth.uid() = user_id);
create policy "items_own_clothing_items_insert"
  on clothing_items for insert with check (auth.uid() = user_id);
create policy "items_own_clothing_items_update"
  on clothing_items for update using (auth.uid() = user_id);
create policy "items_own_clothing_items_delete"
  on clothing_items for delete using (auth.uid() = user_id);

-- RLS policies: outfits
create policy "outfits_own_outfits_select"
  on outfits for select using (auth.uid() = user_id);
create policy "outfits_own_outfits_insert"
  on outfits for insert with check (auth.uid() = user_id);
create policy "outfits_own_outfits_update"
  on outfits for update using (auth.uid() = user_id);
create policy "outfits_own_outfits_delete"
  on outfits for delete using (auth.uid() = user_id);

-- RLS policies: wear_logs
create policy "wear_logs_own_wear_logs_select"
  on wear_logs for select using (auth.uid() = user_id);
create policy "wear_logs_own_wear_logs_insert"
  on wear_logs for insert with check (auth.uid() = user_id);
create policy "wear_logs_own_wear_logs_update"
  on wear_logs for update using (auth.uid() = user_id);
create policy "wear_logs_own_wear_logs_delete"
  on wear_logs for delete using (auth.uid() = user_id);

-- RLS policies: agent_progress
create policy "agent_progress_own_agent_progress_select"
  on agent_progress for select using (auth.uid() = user_id);
create policy "agent_progress_own_agent_progress_insert"
  on agent_progress for insert with check (auth.uid() = user_id);
create policy "agent_progress_own_agent_progress_update"
  on agent_progress for update using (auth.uid() = user_id);
create policy "agent_progress_own_agent_progress_delete"
  on agent_progress for delete using (auth.uid() = user_id);

-- match_clothing: vector similarity search function
create or replace function match_clothing(
  query_embedding   vector(768),
  user_id_filter    uuid,
  match_count       int     default 10,
  match_threshold   float   default 0.7
)
returns table(id uuid, similarity float)
language sql stable
as $$
  select
    ci.id,
    1 - (ci.embedding <=> query_embedding) as similarity
  from clothing_items ci
  where
    ci.user_id = user_id_filter
    and 1 - (ci.embedding <=> query_embedding) >= match_threshold
  order by ci.embedding <=> query_embedding
  limit match_count;
$$;
