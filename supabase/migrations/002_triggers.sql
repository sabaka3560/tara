-- Migration: 002_triggers.sql
-- Add updated_at columns to profiles and clothing_items
alter table profiles       add column updated_at timestamptz default now();
alter table clothing_items add column updated_at timestamptz default now();

-- Function: set updated_at to current timestamp
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger: profiles updated_at
create trigger profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at();

-- Trigger: clothing_items updated_at
create trigger clothing_items_updated_at
  before update on clothing_items
  for each row
  execute function update_updated_at();
