-- Push subscriptions table
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  device_id     text not null,
  user_id       uuid references auth.users(id) on delete set null,
  subscription  jsonb not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(device_id)
);

alter table public.push_subscriptions enable row level security;

-- Anyone can upsert their own subscription (identified by device_id)
create policy "upsert own subscription"
  on public.push_subscriptions for all
  using (true) with check (true);

-- Add notification tracking columns to game_saves
alter table public.game_saves
  add column if not exists last_seen_at   timestamptz default now(),
  add column if not exists hammers_full_at timestamptz;
