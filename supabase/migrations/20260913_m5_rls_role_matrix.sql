BEGIN;

-- =============================================================
-- M5 / 5a — RLS rewrite for 5-role permission matrix
-- =============================================================

-- 1. DROP all existing policies on public schema tables
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

-- -------------------------------------------------------------
-- 2. CREATE new policies using can_*() helpers
-- -------------------------------------------------------------

-- organizations & org_settings
CREATE POLICY org_read ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.jwt_org_id() AND public.can_read_org_settings());

CREATE POLICY org_settings_read ON public.org_settings
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_read_org_settings());

-- employees — org-scoped read (ยังไม่มี GRANT SELECT: จัดการผ่าน admin_* RPC)
CREATE POLICY staff_read ON public.employees
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_manage_employees());

-- tables
CREATE POLICY staff_read ON public.tables
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND (public.can_operate_pos() OR public.can_kitchen()));

CREATE POLICY staff_update ON public.tables
  FOR UPDATE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_operate_pos())
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_operate_pos());

-- orders
CREATE POLICY staff_read ON public.orders
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND (public.can_operate_pos() OR public.can_kitchen()));

-- order_items
CREATE POLICY staff_read ON public.order_items
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND (public.can_operate_pos() OR public.can_kitchen()));

CREATE POLICY staff_serve ON public.order_items
  FOR UPDATE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_kitchen())
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_kitchen());

-- menu_items
CREATE POLICY staff_read ON public.menu_items
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND (public.can_operate_pos() OR public.can_write_catalog() OR public.can_read_sales()));

CREATE POLICY owner_write ON public.menu_items
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_write_catalog())
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_write_catalog());

-- promotions
CREATE POLICY staff_read ON public.promotions
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND (public.can_operate_pos() OR public.can_write_catalog()));

CREATE POLICY owner_write ON public.promotions
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_write_catalog())
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_write_catalog());

-- qr_sessions
CREATE POLICY staff_read ON public.qr_sessions
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_operate_pos());

CREATE POLICY staff_create ON public.qr_sessions
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_operate_pos());

-- loyalty_members
CREATE POLICY staff_read ON public.loyalty_members
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND (public.can_operate_pos() OR public.can_manage_loyalty()));

CREATE POLICY staff_create ON public.loyalty_members
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_operate_pos());

CREATE POLICY owner_update ON public.loyalty_members
  FOR UPDATE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_manage_loyalty())
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_manage_loyalty());

CREATE POLICY owner_delete ON public.loyalty_members
  FOR DELETE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_manage_loyalty());

-- payments, payment_promotions, void_logs (sales read only)
CREATE POLICY staff_read ON public.payments
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_read_sales());

CREATE POLICY staff_read ON public.payment_promotions
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_read_sales());

CREATE POLICY staff_read ON public.void_logs
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_read_sales());

-- stock_logs, item_ingredients, purchase_orders (stock management)
CREATE POLICY owner_read ON public.stock_logs
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_manage_stock());

CREATE POLICY owner_read ON public.item_ingredients
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_manage_stock());

CREATE POLICY owner_write ON public.item_ingredients
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_manage_stock())
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_manage_stock());

CREATE POLICY owner_read ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_manage_stock());

CREATE POLICY owner_write ON public.purchase_orders
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_manage_stock())
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_manage_stock());

-- points_logs (loyalty management)
CREATE POLICY owner_read ON public.points_logs
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_manage_loyalty());

CREATE POLICY owner_write ON public.points_logs
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_manage_loyalty());

COMMIT;
