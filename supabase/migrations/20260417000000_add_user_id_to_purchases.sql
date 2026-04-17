-- Add user_id to both purchase tables for cross-device restore via Google account
ALTER TABLE play_purchases ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE purchases      ADD COLUMN IF NOT EXISTS user_id text;

CREATE INDEX IF NOT EXISTS idx_play_purchases_user_id ON play_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id      ON purchases(user_id);
