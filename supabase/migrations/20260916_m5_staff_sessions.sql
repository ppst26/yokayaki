BEGIN;

-- =============================================================
-- M5 / 5c — staff_sessions + login_audit
--
-- Session revoke + login audit trail — จัดการผ่าน API service_role เท่านั้น
-- JWT มี claim session_id อ้างอิง staff_sessions.id
-- =============================================================

CREATE TABLE public.staff_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  INT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  device_hint  TEXT
);

CREATE INDEX idx_staff_sessions_employee ON public.staff_sessions (employee_id);
CREATE INDEX idx_staff_sessions_org_active ON public.staff_sessions (org_id)
  WHERE revoked_at IS NULL;

CREATE TABLE public.login_audit (
  id           BIGSERIAL PRIMARY KEY,
  employee_id  INT,
  org_id       UUID,
  event        TEXT NOT NULL CHECK (event IN ('login_success', 'login_fail', 'logout', 'revoke')),
  ip_hint      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_audit_org_created ON public.login_audit (org_id, created_at DESC);

ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_audit ENABLE ROW LEVEL SECURITY;
-- ไม่สร้าง policy = client role แตะไม่ได้ (service_role bypass RLS)

REVOKE ALL ON public.staff_sessions, public.login_audit FROM anon, authenticated;
GRANT ALL ON public.staff_sessions, public.login_audit TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.login_audit_id_seq TO service_role;

COMMIT;
