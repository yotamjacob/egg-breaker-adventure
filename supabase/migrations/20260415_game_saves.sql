-- Cloud save table: one row per authenticated user
create table if not exists public.game_saves (
  user_id   uuid        primary key references auth.users(id) on delete cascade,
  save_data text        not null,
  saved_at  timestamptz not null default now()
);

alter table public.game_saves enable row level security;

-- Users can only read and write their own row
create policy "Users manage own save"
  on public.game_saves
  for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);
