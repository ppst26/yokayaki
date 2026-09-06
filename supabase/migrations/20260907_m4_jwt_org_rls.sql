BEGIN;

-- =============================================================
-- M4 / 4b — jwt_org_id() + tenant-scoped RLS rewrite
-- =============================================================

CREATE OR REPLACE FUNCTION public.jwt_org_id()
RETURNS UUID
LANGUAGE sql STABLE
SET search_path = public
AS $fn$
  SELECT NULLIF(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'org_id', ''
  )::UUID;
$fn$;

REVOKE EXECUTE ON FUNCTION public.jwt_org_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jwt_org_id() TO authenticated, service_role;

-- DROP policies เก่า (ชื่อจาก 20260824)
DO $do$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$do$;

-- organizations / org_settings
CREATE POLICY org_read ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY org_settings_read ON public.org_settings
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

-- employees — org-scoped read (ไม่ GRANT SELECT: pin_bcrypt ห้ามหลุด · จัดการผ่าน admin_* RPC)
CREATE POLICY staff_read ON public.employees
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

-- pattern สำหรับตารางที่มี org_id
CREATE POLICY staff_read ON public.tables
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.orders
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.order_items
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_serve ON public.order_items
  FOR UPDATE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.menu_items
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY owner_write ON public.menu_items
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY staff_read ON public.promotions
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY owner_write ON public.promotions
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY staff_read ON public.qr_sessions
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_create ON public.qr_sessions
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.loyalty_members
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_create ON public.loyalty_members
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY owner_update ON public.loyalty_members
  FOR UPDATE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_delete ON public.loyalty_members
  FOR DELETE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY staff_read ON public.payments
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.payment_promotions
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.void_logs
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY owner_read ON public.stock_logs
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_read ON public.points_logs
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_write ON public.points_logs
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_read ON public.item_ingredients
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_write ON public.item_ingredients
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_read ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_write ON public.purchase_orders
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY staff_update ON public.tables
  FOR UPDATE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_staff());

COMMIT;
