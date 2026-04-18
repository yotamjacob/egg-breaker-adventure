-- Store hammers_full_at in push_subscriptions so notifications work without cloud save
alter table public.push_subscriptions add column if not exists hammers_full_at timestamptz;
