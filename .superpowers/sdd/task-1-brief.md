### Task 1: Database Migration — Schema & RPC Hardening

**Files:**
- Create: `supabase/migrations/20261031_hierarchical_categories_and_promo_targets.sql`

**Interfaces:**
- Produces: 
  - `menu_categories.parent_id` column with index
  - `promotion_targets` table with RLS and authenticated grants
  - Updated `complete_checkout` function supporting `promotion_targets`

- [ ] **Step 1: Write the migration SQL file**
Write `supabase/migrations/20261031_hierarchical_categories_and_promo_targets.sql`:
```sql
BEGIN;

-- 1. Add parent_id to menu_categories for 2-tier hierarchy
ALTER TABLE public.menu_categories 
  ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES public.menu_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_menu_categories_parent_id 
  ON public.menu_categories (parent_id);

-- 2. Create promotion_targets table
CREATE TABLE IF NOT EXISTS public.promotion_targets (
  id           SERIAL PRIMARY KEY,
  org_id       UUID NOT NULL DEFAULT public.jwt_org_id() 
               REFERENCES public.organizations(id) ON DELETE CASCADE,
  promotion_id INT NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  target_type  TEXT NOT NULL CHECK (target_type IN ('main_category', 'sub_category', 'menu_item')),
  target_id    INT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promotion_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_targets_promo_id 
  ON public.promotion_targets (promotion_id);
CREATE INDEX IF NOT EXISTS idx_promo_targets_type_id 
  ON public.promotion_targets (target_type, target_id);

-- 3. RLS & Privileges
ALTER TABLE public.promotion_targets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.promotion_targets FROM anon, PUBLIC;
GRANT SELECT ON public.promotion_targets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotion_targets TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.promotion_targets_id_seq TO authenticated;

DROP POLICY IF EXISTS promo_targets_read ON public.promotion_targets;
CREATE POLICY promo_targets_read ON public.promotion_targets
  FOR SELECT TO authenticated
  USING (
    org_id = public.jwt_org_id()
    AND (public.can_operate_pos() OR public.can_write_catalog() OR public.can_kitchen())
  );

DROP POLICY IF EXISTS promo_targets_write ON public.promotion_targets;
CREATE POLICY promo_targets_write ON public.promotion_targets
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.can_write_catalog())
  WITH CHECK (org_id = public.jwt_org_id() AND public.can_write_catalog());

-- 4. Update complete_checkout RPC to support promotion_targets
CREATE OR REPLACE FUNCTION public.complete_checkout(
  p_order_id      INT,
  p_cash_received DECIMAL(10, 2) DEFAULT 0,
  p_coupon_code   VARCHAR(30)    DEFAULT NULL,
  p_phone_number  VARCHAR(10)    DEFAULT NULL,
  p_points_redeem INT            DEFAULT 0
) RETURNS TABLE (
  status           TEXT,
  payment_id       INT,
  subtotal         DECIMAL(10, 2),
  promo_discount   DECIMAL(10, 2),
  points_redeemed  INT,
  discount_amount  DECIMAL(10, 2),
  net_amount       DECIMAL(10, 2),
  points_earned    INT,
  cash_amount      DECIMAL(10, 2),
  promptpay_amount DECIMAL(10, 2),
  change_amount    DECIMAL(10, 2),
  payment_method   TEXT,
  applied_promos   JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  c_points_per_baht CONSTANT INT := 10;
  c_store_tz        CONSTANT TEXT := 'Asia/Bangkok';

  v_order_status   TEXT;
  v_table_id       UUID;
  v_emp_id         INT;
  v_emp_name       TEXT;
  v_org_id         UUID;
  v_today          DATE;
  v_promo          RECORD;
  v_value          DECIMAL(10, 2);
  v_free           JSONB;
  v_set_size       INT;
  v_member_pts     INT;
  v_pts_to_use     INT := 0;
  v_pts_discount   DECIMAL(10, 2) := 0;
  v_phone          VARCHAR(10);
  v_pay_id         INT;
  v_cash_in        DECIMAL(10, 2);
  v_has_targets    BOOLEAN;

  r_subtotal       DECIMAL(10, 2) := 0;
  r_promo_disc     DECIMAL(10, 2) := 0;
  r_total_disc     DECIMAL(10, 2) := 0;
  r_net            DECIMAL(10, 2) := 0;
  r_pts_earned     INT := 0;
  r_cash           DECIMAL(10, 2) := 0;
  r_promptpay      DECIMAL(10, 2) := 0;
  r_change         DECIMAL(10, 2) := 0;
  r_method         TEXT;
  r_applied        JSONB := '[]'::JSONB;
BEGIN
  IF NOT (public.can_operate_pos() OR public.can_write_catalog()) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ปิดบิล (ต้องเป็น staff หรือ owner)';
  END IF;

  v_emp_id   := public.jwt_emp_id();
  v_emp_name := public.jwt_emp_name();
  v_org_id   := public.jwt_org_id();

  SELECT o.status, o.table_id INTO v_order_status, v_table_id
  FROM orders o
  WHERE o.id = p_order_id AND o.org_id = v_org_id
  FOR UPDATE;

  IF v_order_status IS NULL THEN
    RAISE EXCEPTION 'ไม่พบออเดอร์หมายเลข %', p_order_id;
  END IF;

  IF v_order_status <> 'active' THEN
    RAISE EXCEPTION 'ออเดอร์นี้อยู่ในสถานะ % ไม่สามารถปิดบิลซ้ำได้', v_order_status;
  END IF;

  SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) INTO r_subtotal
  FROM order_items oi
  WHERE oi.order_id = p_order_id AND oi.status <> 'voided';

  v_today := (NOW() AT TIME ZONE c_store_tz)::DATE;

  FOR v_promo IN
    SELECT * FROM promotions p
    WHERE p.org_id = v_org_id
      AND COALESCE(p.is_active, FALSE)
      AND (p.start_date IS NULL OR p.start_date <= v_today)
      AND (p.end_date   IS NULL OR p.end_date   >= v_today)
    ORDER BY p.id
  LOOP
    IF v_promo.type = 'fixed' AND v_promo.coupon_code IS NOT NULL THEN
      IF p_coupon_code IS NULL
         OR UPPER(TRIM(p_coupon_code)) <> UPPER(TRIM(v_promo.coupon_code)) THEN
        CONTINUE;
      END IF;
    END IF;

    IF COALESCE(v_promo.min_order_amount, 0) > 0
       AND r_subtotal < v_promo.min_order_amount THEN
      CONTINUE;
    END IF;

    v_value := 0;
    v_free  := NULL;

    SELECT EXISTS(
      SELECT 1 FROM promotion_targets pt WHERE pt.promotion_id = v_promo.id
    ) INTO v_has_targets;

    IF v_promo.type = 'percentage' AND COALESCE(v_promo.discount_percent, 0) > 0 THEN
      IF NOT v_has_targets AND v_promo.menu_item_id IS NULL 
         AND v_promo.start_time IS NULL AND v_promo.end_time IS NULL THEN
        v_value := ROUND(r_subtotal * v_promo.discount_percent / 100.0, 0);
      ELSE
        SELECT COALESCE(SUM(ROUND(oi.quantity * oi.unit_price * v_promo.discount_percent / 100.0, 0)), 0)
        INTO v_value
        FROM order_items oi
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id = p_order_id AND oi.status <> 'voided'
          AND (
            NOT v_has_targets AND (v_promo.menu_item_id IS NULL OR oi.menu_item_id = v_promo.menu_item_id)
            OR (
              v_has_targets AND (
                EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'menu_item' AND pt.target_id = oi.menu_item_id
                )
                OR EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  JOIN menu_categories c ON c.id = pt.target_id
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'sub_category' AND c.name = mi.category
                )
                OR EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  JOIN menu_categories parent ON parent.id = pt.target_id
                  JOIN menu_categories child ON child.parent_id = parent.id
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'main_category' AND child.name = mi.category
                )
              )
            )
          )
          AND (v_promo.start_time IS NULL OR v_promo.end_time IS NULL
               OR ((oi.created_at AT TIME ZONE c_store_tz)::TIME >= v_promo.start_time
                   AND (oi.created_at AT TIME ZONE c_store_tz)::TIME <  v_promo.end_time));
      END IF;

    ELSIF v_promo.type = 'fixed' THEN
      v_value := COALESCE(v_promo.discount_amount, 0);

    ELSIF v_promo.type = 'buy_x_get_y'
          AND COALESCE(v_promo.buy_qty, 0) > 0 AND COALESCE(v_promo.free_qty, 0) > 0 THEN
      v_set_size := v_promo.buy_qty + v_promo.free_qty;

      WITH grouped AS (
        SELECT oi.menu_item_id, mi.name,
               SUM(oi.quantity)::INT AS qty,
               MIN(oi.unit_price)    AS price
        FROM order_items oi
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id = p_order_id AND oi.status <> 'voided'
          AND (
            NOT v_has_targets AND (v_promo.menu_item_id IS NULL OR oi.menu_item_id = v_promo.menu_item_id)
            OR (
              v_has_targets AND (
                EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'menu_item' AND pt.target_id = oi.menu_item_id
                )
                OR EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  JOIN menu_categories c ON c.id = pt.target_id
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'sub_category' AND c.name = mi.category
                )
                OR EXISTS (
                  SELECT 1 FROM promotion_targets pt 
                  JOIN menu_categories parent ON parent.id = pt.target_id
                  JOIN menu_categories child ON child.parent_id = parent.id
                  WHERE pt.promotion_id = v_promo.id AND pt.target_type = 'main_category' AND child.name = mi.category
                )
              )
            )
          )
        GROUP BY oi.menu_item_id, mi.name
      ), freebies AS (
        SELECT g.name, g.price,
               (FLOOR(g.qty::NUMERIC / v_set_size) * v_promo.free_qty)::INT AS free_qty
        FROM grouped g
      )
      SELECT COALESCE(SUM(f.free_qty * f.price), 0),
             COALESCE(jsonb_agg(jsonb_build_object('name', f.name, 'qty', f.free_qty)), '[]'::JSONB)
      INTO v_value, v_free
      FROM freebies f WHERE f.free_qty > 0;
    END IF;

    IF COALESCE(v_value, 0) > 0 THEN
      r_promo_disc := r_promo_disc + v_value;
      r_applied := r_applied || jsonb_build_object(
        'promotion_id',   v_promo.id,
        'promotion_name', v_promo.name,
        'promotion_type', v_promo.type,
        'discount_value', v_value,
        'free_items',     v_free
      );
    END IF;
  END LOOP;

  r_promo_disc := LEAST(r_promo_disc, r_subtotal);

  IF p_phone_number IS NOT NULL AND LENGTH(TRIM(p_phone_number)) = 10 THEN
    v_phone := TRIM(p_phone_number);
    SELECT lm.points INTO v_member_pts
    FROM loyalty_members lm 
    WHERE lm.phone_number = v_phone AND lm.org_id = v_org_id 
    FOR UPDATE;
  END IF;

  IF v_member_pts IS NOT NULL THEN
    v_pts_to_use := GREATEST(0, LEAST(COALESCE(p_points_redeem, 0), v_member_pts));
    v_pts_discount := LEAST(v_pts_to_use::DECIMAL(10, 2), r_subtotal - r_promo_disc);
    v_pts_to_use := v_pts_discount::INT;
  END IF;

  r_total_disc := r_promo_disc + v_pts_discount;
  r_net        := GREATEST(0, r_subtotal - r_total_disc);
  r_pts_earned := FLOOR(r_net / c_points_per_baht)::INT;

  v_cash_in := GREATEST(0, COALESCE(p_cash_received, 0));
  IF v_cash_in >= r_net THEN
    r_cash      := r_net;
    r_promptpay := 0;
    r_change    := v_cash_in - r_net;
    r_method    := 'cash';
  ELSIF v_cash_in > 0 THEN
    r_cash      := v_cash_in;
    r_promptpay := r_net - v_cash_in;
    r_change    := 0;
    r_method    := 'mixed';
  ELSE
    r_cash      := 0;
    r_promptpay := r_net;
    r_change    := 0;
    r_method    := 'promptpay';
  END IF;

  INSERT INTO payments (
    order_id, subtotal, discount_amount, net_amount,
    cash_amount, promptpay_amount, change_amount,
    payment_method, points_earned, points_redeemed,
    phone_number, created_by, created_by_name, org_id
  ) VALUES (
    p_order_id, r_subtotal, r_total_disc, r_net,
    r_cash, r_promptpay, r_change,
    r_method, r_pts_earned, v_pts_to_use,
    v_phone, v_emp_id, v_emp_name, v_org_id
  ) RETURNING id INTO v_pay_id;

  IF jsonb_array_length(r_applied) > 0 THEN
    INSERT INTO payment_promotions (payment_id, promotion_id, discount_applied, org_id)
    SELECT v_pay_id, (p->>'promotion_id')::INT, (p->>'discount_value')::DECIMAL, v_org_id
    FROM jsonb_array_elements(r_applied) p;
  END IF;

  IF v_phone IS NOT NULL THEN
    UPDATE loyalty_members
    SET points = points - v_pts_to_use + r_pts_earned,
        total_spent = total_spent + r_net
    WHERE phone_number = v_phone AND org_id = v_org_id;

    IF v_pts_to_use > 0 THEN
      INSERT INTO points_logs (member_phone, points_change, reason, org_id)
      VALUES (v_phone, -v_pts_to_use, 'Redeemed in order #' || p_order_id, v_org_id);
    END IF;
    IF r_pts_earned > 0 THEN
      INSERT INTO points_logs (member_phone, points_change, reason, org_id)
      VALUES (v_phone, r_pts_earned, 'Earned from order #' || p_order_id, v_org_id);
    END IF;
  END IF;

  UPDATE orders
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_order_id AND org_id = v_org_id;

  UPDATE order_items
  SET status = 'served'
  WHERE order_id = p_order_id AND status = 'pending';

  IF v_table_id IS NOT NULL THEN
    UPDATE tables SET status = 'vacant' WHERE id = v_table_id AND org_id = v_org_id;
    UPDATE qr_sessions
    SET status = 'expired'
    WHERE table_id = v_table_id AND org_id = v_org_id AND status = 'active';
  END IF;

  RETURN QUERY SELECT
    'success'::TEXT, v_pay_id, r_subtotal, r_promo_disc,
    v_pts_to_use, r_total_disc, r_net, r_pts_earned,
    r_cash, r_promptpay, r_change, r_method, r_applied;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.complete_checkout(INT, DECIMAL, VARCHAR, VARCHAR, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_checkout(INT, DECIMAL, VARCHAR, VARCHAR, INT) TO authenticated;

COMMIT;
```

- [ ] **Step 2: Commit the migration**
```bash
git add supabase/migrations/20261031_hierarchical_categories_and_promo_targets.sql
git commit -m "feat(db): add hierarchical categories and promotion_targets schema"
```
