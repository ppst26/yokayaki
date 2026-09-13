-- =============================================================
-- เพิ่มหมวดมาตรฐาน: ซาชิมิ · ของย่าง
-- (rename จากชื่อเก่าถ้ายังค้างใน DB)
-- =============================================================

BEGIN;

UPDATE public.menu_items
SET category = 'ของย่าง'
WHERE category IN ('ย่าง', 'เสียบไม้ย่าง', 'เสียบไม้/ย่าง');

UPDATE public.menu_items
SET category = 'ซาชิมิ'
WHERE category IN ('ซาซิมิ');

COMMIT;
