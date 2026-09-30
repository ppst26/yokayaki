-- =============================================================
-- ตาราง menu_categories — เก็บหมวดหมู่เมนูใน DB (แทน hardcode)
-- CRUD ผ่าน client (authenticated + can_write_catalog)
-- =============================================================

BEGIN;

-- 1. สร้างตาราง
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id          SERIAL PRIMARY KEY,
  org_id      UUID NOT NULL DEFAULT public.jwt_org_id()
                   REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ชื่อหมวดต้องไม่ซ้ำในแต่ละ org
  UNIQUE (org_id, name)
);

-- 2. Enable RLS
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- 3. REVOKE all → GRANT เท่าที่ต้องใช้
REVOKE ALL ON public.menu_categories FROM anon, authenticated;
GRANT SELECT ON public.menu_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_categories TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.menu_categories_id_seq TO authenticated;

-- 4. RLS Policies
-- อ่าน: POS + catalog + kitchen (ทุกคนที่ login ต้องเห็นหมวดหมู่)
CREATE POLICY cat_read ON public.menu_categories
  FOR SELECT TO authenticated
  USING (
    org_id = public.jwt_org_id()
    AND (public.can_operate_pos() OR public.can_write_catalog() OR public.can_kitchen())
  );

-- เขียน (insert/update/delete): เฉพาะ owner/manager
CREATE POLICY cat_write ON public.menu_categories
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_write_catalog())
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_write_catalog());

-- 5. Index สำหรับ sort
CREATE INDEX IF NOT EXISTS idx_menu_categories_org_sort
  ON public.menu_categories (org_id, sort_order);

-- 6. Seed หมวดมาตรฐานจากค่าเดิมที่ hardcode ไว้
-- org_id ต้องตรงกับ seed org ที่มีอยู่
INSERT INTO public.menu_categories (org_id, name, sort_order) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Today''s Special', 1),
  ('00000000-0000-4000-8000-000000000001', 'Appetizer',        2),
  ('00000000-0000-4000-8000-000000000001', 'ของย่าง',          3),
  ('00000000-0000-4000-8000-000000000001', 'ยำไทย',            4),
  ('00000000-0000-4000-8000-000000000001', 'อิ่มท้อง',          5),
  ('00000000-0000-4000-8000-000000000001', 'สลัด',             6),
  ('00000000-0000-4000-8000-000000000001', 'จานหลัก',          7),
  ('00000000-0000-4000-8000-000000000001', 'ซาชิมิ',           8),
  ('00000000-0000-4000-8000-000000000001', 'ซูชิ',             9),
  ('00000000-0000-4000-8000-000000000001', 'โรล',             10),
  ('00000000-0000-4000-8000-000000000001', 'มากิ',            11),
  ('00000000-0000-4000-8000-000000000001', 'เครื่องดื่ม',       12),
  ('00000000-0000-4000-8000-000000000001', 'อื่นๆ',           13)
ON CONFLICT (org_id, name) DO NOTHING;

COMMIT;
