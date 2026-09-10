-- =============================================================
-- ลบเมนูที่ไม่มีรูป (image_url ว่าง) — เก็บรายการที่มีประวัติออเดอร์
-- =============================================================

BEGIN;

UPDATE public.promotions
SET menu_item_id = NULL
WHERE menu_item_id IN (
  SELECT id
  FROM public.menu_items
  WHERE image_url IS NULL OR BTRIM(image_url) = ''
);

DELETE FROM public.stock_logs
WHERE menu_item_id IN (
  SELECT id
  FROM public.menu_items
  WHERE image_url IS NULL OR BTRIM(image_url) = ''
);

DELETE FROM public.menu_items mi
WHERE (mi.image_url IS NULL OR BTRIM(mi.image_url) = '')
  AND NOT EXISTS (
    SELECT 1
    FROM public.order_items oi
    WHERE oi.menu_item_id = mi.id
  );

COMMIT;
