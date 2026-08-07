-- =============================================
-- Migration: Add image_url to menu_items table
-- =============================================

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- Sample preset images for standard menu items
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=500&auto=format&fit=crop&q=80' WHERE name LIKE '%ซาซิมิ%' AND image_url IS NULL;
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500&auto=format&fit=crop&q=80' WHERE name LIKE '%ยากิโทริ%' AND image_url IS NULL;
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80' WHERE name LIKE '%ราเมง%' AND image_url IS NULL;
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=80' WHERE name LIKE '%ข้าว%' AND image_url IS NULL;
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&auto=format&fit=crop&q=80' WHERE name LIKE '%ชา%' AND image_url IS NULL;
