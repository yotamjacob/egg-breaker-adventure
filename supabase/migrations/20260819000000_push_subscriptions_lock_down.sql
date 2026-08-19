-- Lock down push_subscriptions (v3.10.10).
--
-- The original policy ("upsert own subscription", for all using(true) with
-- check(true)) let ANY holder of the public anon key read every FCM token /
-- web-push endpoint / user_id, delete every row, or insert unbounded rows.
-- Every legitimate read/write already goes through the service-role edge
-- functions (subscribe-push, send-notifications), which bypass RLS, so the
-- table needs no anon policy at all. RLS stays enabled with no policies =
-- anon/authenticated get nothing.
drop policy if exists "upsert own subscription" on public.push_subscriptions;
alter table public.push_subscriptions enable row level security;
