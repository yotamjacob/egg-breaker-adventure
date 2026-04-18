ALTER TABLE play_purchases ADD COLUMN IF NOT EXISTS disabled boolean DEFAULT false;
ALTER TABLE purchases     ADD COLUMN IF NOT EXISTS disabled boolean DEFAULT false;
