-- =============================================================
-- ย้ายเมนูจากหมวดเก่า → หมวดมาตรฐานใหม่
-- ให้ POS / ลูกค้า เห็นลำดับหมวดเดียวกัน
-- =============================================================

BEGIN;

UPDATE public.menu_items
SET category = CASE
  -- 1) Recommend
  WHEN name ILIKE '%ต้องลอง%' THEN 'Recommend'

  -- 2) โรล / มากิ / ซูชิ
  WHEN name ILIKE '%โรล%' OR name ILIKE '%roll%' THEN 'โรล'
  WHEN name ILIKE '%มากิ%' OR name IN ('ปูอัด', 'ไข่หวาน') THEN 'มากิ'
  WHEN name ILIKE 'ซูชิ%'
    OR name ILIKE 'ซูซิ%'
    OR name IN (
      'AKAMI', 'CHUTORO', 'HAMAJI', 'HOTATE', 'OTORO',
      'TUNA (YELLOW FIN)', 'TUNA 3 KINDS (6PCS)',
      'กุนกันอุนิ', 'หอยเชล', 'แซลม่อลซาซิมิ'
    )
    OR category = 'ซาซิมิ'
    THEN 'ซูชิ'

  -- 3) ยำ / สลัด
  WHEN name ILIKE 'ยำ%' OR category IN ('ยำ', 'ยำไทย') THEN 'ยำไทย'
  WHEN name ILIKE 'สลัด%' THEN 'สลัด'

  -- 4) อิ่มท้อง
  WHEN category IN ('เส้น', 'หม้อไฟ', 'ข้าว', 'ต้ม/แกง', 'อิ่มท้อง')
    OR name IN ('ข้าวปั้น', 'ข้าวหน้าปลาไหลล้น', 'เซ็ตอูด้ง', 'ข้าวเปล่า')
    OR name ILIKE 'ข้าวหน้า%'
    OR name ILIKE '%อุด้ง%'
    OR name ILIKE '%อูด้ง%'
    OR name ILIKE '%โซบะ%'
    OR name ILIKE '%โซเมน%'
    OR name ILIKE 'นาเบะ%'
    THEN 'อิ่มท้อง'

  -- 5) จานหลัก
  WHEN name IN ('หอยนางรม')
    OR name ILIKE 'สเต็ก%'
    OR name ILIKE 'ปลาแซลมอน%'
    OR name ILIKE 'ปลาหิมะ%'
    OR name ILIKE 'เนื้อลูกเต๋า%'
    THEN 'จานหลัก'

  -- 6) เครื่องดื่ม
  WHEN category = 'เครื่องดื่ม' THEN 'เครื่องดื่ม'

  -- 7) Appetizer (เดิม ทานเล่น / ย่าง / เสียบไม้)
  WHEN category IN ('ย่าง', 'กินเล่น', 'ทานเล่น', 'เสียบไม้ย่าง', 'เสียบไม้/ย่าง', 'Appetizer')
    OR name IN (
      'กิมจิ', 'เกี้ยวซ่า', 'ไก่คาราเกะ', 'เต้าหู้เย็น', 'แตงกวาน้ำมันงา',
      'ทาโกะยากิ', 'ทาโกะวาซาบิ', 'เฟรนซ์ฟาย', 'ลิ้นวัวย่าง',
      'ไส้กรอกอาราบิกิย่าง', 'เอ็นไก่ทอด', 'กึ๋น'
    )
    THEN 'Appetizer'

  ELSE 'อื่นๆ'
END;

COMMIT;
