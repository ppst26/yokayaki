-- Add menu_item_id column to promotions table referencing menu_items
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS menu_item_id INT REFERENCES menu_items(id) ON DELETE SET NULL;
