-- =============================================================
-- เปลี่ยนชื่อหมวด: ทานเล่น → Appetizer · ยำ → ยำไทย
-- และรวบหมวดเก่าที่เหลือเข้ากลุ่มมาตรฐาน
-- =============================================================

BEGIN;

UPDATE public.menu_items
SET category = 'Appetizer'
WHERE category IN ('ทานเล่น', 'กินเล่น', 'ย่าง', 'เสียบไม้ย่าง', 'เสียบไม้/ย่าง');

UPDATE public.menu_items
SET category = 'ยำไทย'
WHERE category = 'ยำ';

UPDATE public.menu_items
SET category = 'อิ่มท้อง'
WHERE category IN ('หม้อไฟ', 'เส้น', 'ข้าว', 'ต้ม/แกง');

UPDATE public.menu_items
SET category = 'ซูชิ'
WHERE category IN ('ซาซิมิ', 'ซาชิมิ');

COMMIT;
