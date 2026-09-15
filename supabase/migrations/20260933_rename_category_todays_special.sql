-- =============================================================
-- เปลี่ยนชื่อหมวดหมู่ Recommend -> Today’s Special
-- ให้ตรงกับ UI ในหน้าจัดการเมนู POS และหน้าลูกค้า
-- =============================================================

BEGIN;

UPDATE public.menu_items
SET category = 'Today’s Special'
WHERE category IN (
  'Recommend',
  'recommend',
  'recoommend',
  'Recommed',
  'แนะนำ',
  'Today''s Special',
  'Today’s Special'
)
OR name ILIKE '%ต้องลอง%';

COMMIT;
