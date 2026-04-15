-- Prevent oversized save payloads (LZ-compressed saves are typically <50KB)
alter table public.game_saves
  add constraint save_data_max_size
  check (length(save_data) < 200000);
