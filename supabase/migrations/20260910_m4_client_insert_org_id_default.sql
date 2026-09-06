BEGIN;

-- =============================================================
-- M4 fix — client INSERT ไม่ส่ง org_id
--
-- POS client insert ผ่าน supabase JS โดยไม่ใส่ org_id
-- RLS WITH CHECK ต้องการ org_id = jwt_org_id()
-- → stamp จาก JWT ตอน INSERT เมื่อ client ไม่ส่งค่า
-- =============================================================

ALTER TABLE public.qr_sessions
  ALTER COLUMN org_id SET DEFAULT public.jwt_org_id();

ALTER TABLE public.menu_items
  ALTER COLUMN org_id SET DEFAULT public.jwt_org_id();

ALTER TABLE public.promotions
  ALTER COLUMN org_id SET DEFAULT public.jwt_org_id();

ALTER TABLE public.loyalty_members
  ALTER COLUMN org_id SET DEFAULT public.jwt_org_id();

COMMIT;
