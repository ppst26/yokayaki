BEGIN;

-- =============================================================
-- Daily orders audit — cashier/kitchen อ่าน void_logs ได้
-- (payments ยัง can_read_sales() เท่านั้น)
-- =============================================================

CREATE OR REPLACE FUNCTION public.can_read_void_logs() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN (
    'owner', 'manager', 'accountant', 'cashier', 'kitchen'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_read_void_logs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_void_logs() TO authenticated, service_role;

DROP POLICY IF EXISTS staff_read ON public.void_logs;
CREATE POLICY staff_read ON public.void_logs
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_read_void_logs());

COMMIT;
