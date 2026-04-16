-- Play Billing purchase records (Android IAP via Digital Goods API)
-- purchase_token is unique — prevents replay attacks / double-grants
create table if not exists play_purchases (
  id             uuid primary key default gen_random_uuid(),
  device_id      text not null,
  product_id     text not null,
  purchase_token text unique not null,
  order_id       text,
  status         text default 'completed' check (status in ('completed')),
  created_at     timestamptz default now()
);

create index if not exists play_purchases_device_id_idx on play_purchases(device_id);
alter table play_purchases enable row level security;
