BEGIN;

-- =============================================================
-- M5 / 5b — memberships + employees.auth_user_id
--
-- ผูก Supabase Auth user ↔ org ↔ role สำหรับ org-level login (Phase 5b)
-- ไม่มี FK ไป auth.users — docker test ไม่มี schema auth (ใช้ UUID คงที่ในเทสต์)
-- จัดการผ่าน API service_role เท่านั้น — ไม่เปิด RLS read ให้ client
-- =============================================================

CREATE TABLE public.memberships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID NOT NULL,
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  employee_id   INT REFERENCES public.employees(id) ON DELETE SET NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen', 'accountant')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id, org_id)
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
-- ไม่สร้าง policy = client role แตะไม่ได้ (service_role bypass RLS)

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS auth_user_id UUID;

REVOKE ALL ON public.memberships FROM anon, authenticated;
GRANT ALL ON public.memberships TO service_role;

COMMIT;
