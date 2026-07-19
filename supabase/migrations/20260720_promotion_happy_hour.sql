-- Add Happy Hour time range columns to promotions table
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT NULL;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT NULL;
