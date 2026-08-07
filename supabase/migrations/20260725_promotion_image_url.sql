-- =============================================
-- Migration: Add image_url to promotions table
-- =============================================

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;
