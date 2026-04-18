-- FCM subscribers don't have a web push subscription object
alter table public.push_subscriptions alter column subscription drop not null;
