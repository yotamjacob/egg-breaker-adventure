create table if not exists purchases (
  id               uuid primary key default gen_random_uuid(),
  device_id        text not null,
  product_id       text not null,
  paypal_order_id  text unique,
  amount           decimal(10,2),
  status           text default 'pending' check (status in ('pending', 'completed')),
  created_at       timestamptz default now()
);

create index if not exists purchases_device_id_idx on purchases(device_id);

alter table purchases enable row level security;
-- Only Edge Functions (service role) can read/write purchases
