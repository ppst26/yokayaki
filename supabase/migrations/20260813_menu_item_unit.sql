-- Add unit column to menu_items table
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS unit VARCHAR(30) NOT NULL DEFAULT 'จาน';

-- Update existing items with sensible defaults (beverages → แก้ว)
UPDATE menu_items SET unit = 'แก้ว' WHERE category = 'เครื่องดื่ม';
