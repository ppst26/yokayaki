-- Soft delete สำหรับ menu_items
-- เมนูที่ is_available = FALSE จะถูกซ่อนจากหน้าสั่ง (POS + ลูกค้า QR)
-- แต่ยังอยู่ในฐานข้อมูลเพื่อ FK integrity กับ order_items เก่า

-- 1. เพิ่มคอลัมน์ is_available (default TRUE = ขายปกติ)
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Partial index — POS + ลูกค้าดึงเฉพาะเมนูที่ขายอยู่
CREATE INDEX IF NOT EXISTS idx_menu_items_available
  ON public.menu_items (org_id) WHERE is_available = TRUE;
