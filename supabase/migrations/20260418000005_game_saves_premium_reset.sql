ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS premium_reset_requested boolean DEFAULT false;
