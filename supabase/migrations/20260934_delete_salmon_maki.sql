-- =============================================================
-- ลบเมนู แซลมอนมากิ พร้อมรายการ order_items ที่เคยผูกอยู่
-- =============================================================

BEGIN;

-- 1. ลบ order_items ที่ผูกกับเมนู แซลมอนมากิ
DELETE FROM public.order_items
WHERE menu_item_id IN (
  SELECT id FROM public.menu_items
  WHERE name IN ('แซลมอนมากิ', 'มากิแซลมอน', 'มากิแซลม่อน', 'แซลม่อนมากิ')
);

-- 2. ลบ stock_logs
DELETE FROM public.stock_logs
WHERE menu_item_id IN (
  SELECT id FROM public.menu_items
  WHERE name IN ('แซลมอนมากิ', 'มากิแซลมอน', 'มากิแซลม่อน', 'แซลม่อนมากิ')
);

-- 3. ปลด promotions
UPDATE public.promotions
SET menu_item_id = NULL
WHERE menu_item_id IN (
  SELECT id FROM public.menu_items
  WHERE name IN ('แซลมอนมากิ', 'มากิแซลมอน', 'มากิแซลม่อน', 'แซลม่อนมากิ')
);

-- 4. ลบเมนู แซลมอนมากิ ออกจาก menu_items
DELETE FROM public.menu_items
WHERE name IN ('แซลมอนมากิ', 'มากิแซลมอน', 'มากิแซลม่อน', 'แซลม่อนมากิ');

COMMIT;
