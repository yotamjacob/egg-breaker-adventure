-- Add deduplication and timezone support to push_subscriptions
alter table public.push_subscriptions
  add column if not exists last_notified_at timestamptz,
  add column if not exists timezone          text;
