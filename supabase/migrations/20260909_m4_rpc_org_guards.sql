BEGIN;

-- =============================================================
-- M4 / 4c — Operational RPC org guards + admin_add_employee org_id
-- =============================================================

-- -------------------------------------------------------------
-- 1. place_order_batch (UUID, JSONB) — POS
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.place_order_batch(INT, JSONB);

CREATE OR REPLACE FUNCTION public.place_order_batch(
  p_table_id UUID,
  p_items    JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org        UUID := public.jwt_org_id();
  v_order_id   INT;
  v_price      DECIMAL(10, 2);
  v_stock      INT;
  v_tracked    BOOLEAN;
  v_hh         BOOLEAN;
  v_hh_price   DECIMAL(10, 2);
  v_base       DECIMAL(10, 2);
  v_line       RECORD;
  v_agg        RECORD;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  PERFORM 1 FROM tables t
  WHERE t.id = p_table_id AND t.org_id = v_org
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_table';
  END IF;

  FOR v_agg IN
    SELECT p.menu_item_id, SUM(p.quantity)::INT AS total_qty
    FROM public._parse_order_items_json(p_items) p
    GROUP BY p.menu_item_id
    ORDER BY p.menu_item_id
  LOOP
    SELECT mi.price, mi.stock, mi.is_stock_tracked, mi.is_happy_hour, mi.happy_hour_price
      INTO v_base, v_stock, v_tracked, v_hh, v_hh_price
    FROM menu_items mi
    WHERE mi.id = v_agg.menu_item_id AND mi.org_id = v_org
    FOR UPDATE;

    IF v_base IS NULL THEN
      RAISE EXCEPTION 'menu_not_found:%', v_agg.menu_item_id;
    END IF;
    IF v_tracked AND v_stock < v_agg.total_qty THEN
      RAISE EXCEPTION 'insufficient_stock:%', v_agg.menu_item_id;
    END IF;
  END LOOP;

  SELECT o.id INTO v_order_id
  FROM orders o
  WHERE o.table_id = p_table_id AND o.org_id = v_org AND o.status = 'active'
  LIMIT 1;

  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, status, org_id)
    VALUES (p_table_id, 'active', v_org)
    RETURNING id INTO v_order_id;
  END IF;

  UPDATE tables SET status = 'occupied'
  WHERE id = p_table_id AND org_id = v_org AND status <> 'checking_out';

  FOR v_line IN
    SELECT p.ord, p.menu_item_id, p.quantity, p.notes
    FROM public._parse_order_items_json(p_items) p
    ORDER BY p.ord
  LOOP
    SELECT mi.price, mi.is_happy_hour, mi.happy_hour_price
      INTO v_base, v_hh, v_hh_price
    FROM menu_items mi WHERE mi.id = v_line.menu_item_id AND mi.org_id = v_org;

    v_price := public.menu_item_sale_price(v_hh, v_base, v_hh_price, NOW());

    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes, org_id)
    VALUES (v_order_id, v_line.menu_item_id, v_line.quantity, v_price, v_line.notes, v_org);
  END LOOP;

  FOR v_agg IN
    SELECT p.menu_item_id, SUM(p.quantity)::INT AS total_qty
    FROM public._parse_order_items_json(p_items) p
    GROUP BY p.menu_item_id
  LOOP
    UPDATE menu_items mi
    SET stock = mi.stock - v_agg.total_qty
    WHERE mi.id = v_agg.menu_item_id AND mi.org_id = v_org AND mi.is_stock_tracked;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'placed', jsonb_array_length(p_items)
  );
END;
$fn$;

COMMENT ON FUNCTION public.place_order_batch(UUID, JSONB) IS
  'สั่งหลายรายการจาก POS — ตรวจ table org_id ตรงกับ JWT + stamp org_id';

REVOKE EXECUTE ON FUNCTION public.place_order_batch(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order_batch(UUID, JSONB) TO authenticated, service_role;

-- -------------------------------------------------------------
-- 2. place_order_item (UUID, INT, INT, VARCHAR) — POS
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.place_order_item(INT, INT, INT, VARCHAR);

CREATE OR REPLACE FUNCTION public.place_order_item(
  p_table_id     UUID,
  p_menu_item_id INT,
  p_quantity     INT,
  p_notes        VARCHAR(255) DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_org      UUID := public.jwt_org_id();
  v_order_id INT;
  v_price    DECIMAL(10, 2);
  v_stock    INT;
  v_tracked  BOOLEAN;
  v_hh       BOOLEAN;
  v_hh_price DECIMAL(10, 2);
  v_base     DECIMAL(10, 2);
BEGIN
  IF v_org IS NULL THEN RETURN FALSE; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN FALSE; END IF;

  PERFORM 1 FROM tables WHERE id = p_table_id AND org_id = v_org FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  SELECT mi.price, mi.stock, mi.is_stock_tracked, mi.is_happy_hour, mi.happy_hour_price
    INTO v_base, v_stock, v_tracked, v_hh, v_hh_price
  FROM menu_items mi WHERE mi.id = p_menu_item_id AND mi.org_id = v_org FOR UPDATE;

  IF v_base IS NULL THEN RETURN FALSE; END IF;

  v_price := public.menu_item_sale_price(v_hh, v_base, v_hh_price, NOW());

  IF v_tracked AND v_stock < p_quantity THEN RETURN FALSE; END IF;

  SELECT o.id INTO v_order_id
  FROM orders o WHERE o.table_id = p_table_id AND o.org_id = v_org AND o.status = 'active' LIMIT 1;

  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, status, org_id) VALUES (p_table_id, 'active', v_org)
    RETURNING id INTO v_order_id;
  END IF;

  UPDATE tables SET status = 'occupied'
  WHERE id = p_table_id AND org_id = v_org AND status <> 'checking_out';

  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes, org_id)
  VALUES (v_order_id, p_menu_item_id, p_quantity, v_price, p_notes, v_org);

  IF v_tracked THEN
    UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id AND org_id = v_org;
  END IF;

  RETURN TRUE;
END;
$fn$;

COMMENT ON FUNCTION public.place_order_item(UUID, INT, INT, VARCHAR) IS
  'สั่งอาหารจากเครื่อง POS — ตรวจ table org_id ตรงกับ JWT + stamp org_id';

REVOKE EXECUTE ON FUNCTION public.place_order_item(UUID, INT, INT, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order_item(UUID, INT, INT, VARCHAR) TO authenticated, service_role;

-- -------------------------------------------------------------
-- 3. customer_place_order_batch (UUID, JSONB) — QR Portal
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.customer_place_order_batch(
  p_session_id UUID,
  p_items      JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_table_id       UUID;
  v_org_id         UUID;
  v_session_status VARCHAR(20);
  v_expired_at     TIMESTAMPTZ;
  v_order_id       INT;
  v_price          DECIMAL(10, 2);
  v_stock          INT;
  v_tracked        BOOLEAN;
  v_hh             BOOLEAN;
  v_hh_price       DECIMAL(10, 2);
  v_base           DECIMAL(10, 2);
  v_line           RECORD;
  v_agg            RECORD;
BEGIN
  SELECT qs.table_id, qs.status, qs.expired_at, qs.org_id
    INTO v_table_id, v_session_status, v_expired_at, v_org_id
  FROM qr_sessions qs WHERE qs.id = p_session_id;

  IF v_table_id IS NULL OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'invalid_session';
  END IF;
  IF v_session_status <> 'active' THEN
    RAISE EXCEPTION 'session_not_active';
  END IF;
  IF v_expired_at IS NOT NULL AND v_expired_at < NOW() THEN
    UPDATE qr_sessions SET status = 'expired' WHERE id = p_session_id;
    RAISE EXCEPTION 'session_expired';
  END IF;

  PERFORM 1 FROM tables WHERE id = v_table_id AND org_id = v_org_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_table';
  END IF;

  FOR v_agg IN
    SELECT p.menu_item_id, SUM(p.quantity)::INT AS total_qty
    FROM public._parse_order_items_json(p_items) p
    GROUP BY p.menu_item_id
    ORDER BY p.menu_item_id
  LOOP
    SELECT mi.price, mi.stock, mi.is_stock_tracked, mi.is_happy_hour, mi.happy_hour_price
      INTO v_base, v_stock, v_tracked, v_hh, v_hh_price
    FROM menu_items mi
    WHERE mi.id = v_agg.menu_item_id AND mi.org_id = v_org_id
    FOR UPDATE;

    IF v_base IS NULL THEN
      RAISE EXCEPTION 'menu_not_found:%', v_agg.menu_item_id;
    END IF;
    IF v_tracked AND v_stock < v_agg.total_qty THEN
      RAISE EXCEPTION 'insufficient_stock:%', v_agg.menu_item_id;
    END IF;
  END LOOP;

  SELECT o.id INTO v_order_id
  FROM orders o
  WHERE o.table_id = v_table_id AND o.org_id = v_org_id AND o.status = 'active'
  LIMIT 1;

  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, qr_session_id, status, org_id)
    VALUES (v_table_id, p_session_id, 'active', v_org_id)
    RETURNING id INTO v_order_id;
  END IF;

  UPDATE tables SET status = 'occupied'
  WHERE id = v_table_id AND org_id = v_org_id AND status <> 'checking_out';

  FOR v_line IN
    SELECT p.ord, p.menu_item_id, p.quantity, p.notes
    FROM public._parse_order_items_json(p_items) p
    ORDER BY p.ord
  LOOP
    SELECT mi.price, mi.is_happy_hour, mi.happy_hour_price
      INTO v_base, v_hh, v_hh_price
    FROM menu_items mi WHERE mi.id = v_line.menu_item_id AND mi.org_id = v_org_id;

    v_price := public.menu_item_sale_price(v_hh, v_base, v_hh_price, NOW());

    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes, org_id)
    VALUES (v_order_id, v_line.menu_item_id, v_line.quantity, v_price, v_line.notes, v_org_id);
  END LOOP;

  FOR v_agg IN
    SELECT p.menu_item_id, SUM(p.quantity)::INT AS total_qty
    FROM public._parse_order_items_json(p_items) p
    GROUP BY p.menu_item_id
  LOOP
    UPDATE menu_items mi
    SET stock = mi.stock - v_agg.total_qty
    WHERE mi.id = v_agg.menu_item_id AND mi.org_id = v_org_id AND mi.is_stock_tracked;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'placed', jsonb_array_length(p_items)
  );
END;
$fn$;

COMMENT ON FUNCTION public.customer_place_order_batch(UUID, JSONB) IS
  'ลูกค้าสั่งหลายรายการ — ตรวจ session->table->org scope + stamp org_id';

REVOKE EXECUTE ON FUNCTION public.customer_place_order_batch(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_place_order_batch(UUID, JSONB) TO service_role;

-- -------------------------------------------------------------
-- 4. customer_place_order_item (UUID, INT, INT, VARCHAR) — QR Portal
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.customer_place_order_item(
  p_session_id   UUID,
  p_menu_item_id INT,
  p_quantity     INT,
  p_notes        VARCHAR(255) DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_table_id       UUID;
  v_org_id         UUID;
  v_session_status VARCHAR(20);
  v_expired_at     TIMESTAMPTZ;
  v_order_id       INT;
  v_price          DECIMAL(10, 2);
  v_stock          INT;
  v_tracked        BOOLEAN;
  v_hh             BOOLEAN;
  v_hh_price       DECIMAL(10, 2);
  v_base           DECIMAL(10, 2);
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN FALSE; END IF;

  SELECT qs.table_id, qs.status, qs.expired_at, qs.org_id
    INTO v_table_id, v_session_status, v_expired_at, v_org_id
  FROM qr_sessions qs WHERE qs.id = p_session_id;

  IF v_table_id IS NULL OR v_org_id IS NULL THEN RETURN FALSE; END IF;
  IF v_session_status <> 'active' THEN RETURN FALSE; END IF;
  IF v_expired_at IS NOT NULL AND v_expired_at < NOW() THEN
    UPDATE qr_sessions SET status = 'expired' WHERE id = p_session_id;
    RETURN FALSE;
  END IF;

  PERFORM 1 FROM tables WHERE id = v_table_id AND org_id = v_org_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  SELECT mi.price, mi.stock, mi.is_stock_tracked, mi.is_happy_hour, mi.happy_hour_price
    INTO v_base, v_stock, v_tracked, v_hh, v_hh_price
  FROM menu_items mi WHERE mi.id = p_menu_item_id AND mi.org_id = v_org_id FOR UPDATE;

  IF v_base IS NULL THEN RETURN FALSE; END IF;

  v_price := public.menu_item_sale_price(v_hh, v_base, v_hh_price, NOW());

  IF v_tracked AND v_stock < p_quantity THEN RETURN FALSE; END IF;

  SELECT o.id INTO v_order_id
  FROM orders o WHERE o.table_id = v_table_id AND o.org_id = v_org_id AND o.status = 'active' LIMIT 1;

  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, qr_session_id, status, org_id)
    VALUES (v_table_id, p_session_id, 'active', v_org_id)
    RETURNING id INTO v_order_id;
  END IF;

  UPDATE tables SET status = 'occupied'
  WHERE id = v_table_id AND org_id = v_org_id AND status <> 'checking_out';

  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes, org_id)
  VALUES (v_order_id, p_menu_item_id, p_quantity, v_price, p_notes, v_org_id);

  IF v_tracked THEN
    UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id AND org_id = v_org_id;
  END IF;

  RETURN TRUE;
END;
$fn$;

COMMENT ON FUNCTION public.customer_place_order_item(UUID, INT, INT, VARCHAR) IS
  'ลูกค้าสั่งผ่าน QR — ตรวจ session->table->org scope + stamp org_id';

REVOKE EXECUTE ON FUNCTION public.customer_place_order_item(UUID, INT, INT, VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_place_order_item(UUID, INT, INT, VARCHAR) TO service_role;

-- -------------------------------------------------------------
-- 5. complete_checkout
-- -------------------------------------------------------------
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
  -- 1 แต้ม = 10 บาทของยอดสุทธิ (ยืนยันโดยเจ้าของร้าน — แทนของเดิมที่โค้ดใช้ /25)
  c_points_per_baht CONSTANT INT := 10;
  -- เวลาของร้าน ใช้ตัดสินช่วง Happy Hour ของโปรโมชั่นให้ตรงกับที่หน้าจอเคยคำนวณ
  c_store_tz        CONSTANT TEXT := 'Asia/Bangkok';

  v_org_id       UUID;
  v_jwt_org      UUID := public.jwt_org_id();
  v_table_id     UUID;
  v_order_status TEXT;
  v_today        DATE;
  v_promo        RECORD;
  v_value        DECIMAL(10, 2);
  v_free         JSONB;
  v_set_size     INT;
  v_member_pts   INT;
  v_phone        VARCHAR(10) := NULLIF(TRIM(COALESCE(p_phone_number, '')), '');
  v_cash_in      DECIMAL(10, 2) := GREATEST(COALESCE(p_cash_received, 0), 0);

  r_subtotal     DECIMAL(10, 2) := 0;
  r_promo_disc   DECIMAL(10, 2) := 0;
  r_points_red   INT := 0;
  r_net          DECIMAL(10, 2) := 0;
  r_points_earn  INT := 0;
  r_cash         DECIMAL(10, 2) := 0;
  r_promptpay    DECIMAL(10, 2) := 0;
  r_change       DECIMAL(10, 2) := 0;
  r_method       TEXT;
  r_applied      JSONB := '[]'::JSONB;
  r_payment_id   INT;
BEGIN
  -- 3.1 ล็อกออเดอร์ก่อนทุกอย่าง (A6) — ดับเบิลคลิกตัวที่สองจะรอตรงนี้
  SELECT o.table_id, o.status::TEXT, o.org_id INTO v_table_id, v_order_status, v_org_id
  FROM orders o WHERE o.id = p_order_id FOR UPDATE;

  IF v_table_id IS NULL OR (v_jwt_org IS NOT NULL AND v_org_id <> v_jwt_org) THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::INT, 0::DECIMAL(10,2), 0::DECIMAL(10,2), 0,
                        0::DECIMAL(10,2), 0::DECIMAL(10,2), 0, 0::DECIMAL(10,2),
                        0::DECIMAL(10,2), 0::DECIMAL(10,2), NULL::TEXT, '[]'::JSONB;
    RETURN;
  END IF;

  -- 3.2 ปิดไปแล้ว → คืนใบเดิม ไม่สร้างใบใหม่ ไม่แตะแต้มซ้ำ (A6)
  IF v_order_status <> 'active' THEN
    SELECT pm.id, pm.subtotal, pm.discount_amount, pm.net_amount, pm.points_earned,
           pm.points_redeemed, pm.cash_amount, pm.promptpay_amount, pm.payment_method::TEXT
    INTO r_payment_id, r_subtotal, v_value, r_net, r_points_earn,
         r_points_red, r_cash, r_promptpay, r_method
    FROM payments pm WHERE pm.order_id = p_order_id AND pm.org_id = v_org_id;

    RETURN QUERY SELECT 'already_completed'::TEXT, r_payment_id, COALESCE(r_subtotal,0),
                        GREATEST(COALESCE(v_value,0) - r_points_red, 0), COALESCE(r_points_red,0),
                        COALESCE(v_value,0), COALESCE(r_net,0), COALESCE(r_points_earn,0),
                        COALESCE(r_cash,0), COALESCE(r_promptpay,0), 0::DECIMAL(10,2),
                        r_method, '[]'::JSONB;
    RETURN;
  END IF;

  -- 3.3 ยอดรวม — มาจากสิ่งที่สั่งจริงเท่านั้น
  SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) INTO r_subtotal
  FROM order_items oi
  WHERE oi.order_id = p_order_id AND oi.org_id = v_org_id AND oi.status <> 'voided';

  v_today := (NOW() AT TIME ZONE c_store_tz)::DATE;

  -- 3.4 โปรโมชั่น — อ่านเงื่อนไขจากตาราง ไม่ใช่จาก payload
  FOR v_promo IN
    SELECT * FROM promotions p
    WHERE p.org_id = v_org_id
      AND COALESCE(p.is_active, FALSE)
      AND (p.start_date IS NULL OR p.start_date <= v_today)
      AND (p.end_date   IS NULL OR p.end_date   >= v_today)
    ORDER BY p.id
  LOOP
    -- คูปอง: ใช้ได้เฉพาะเมื่อผู้ชำระกรอกรหัสตรงกันเท่านั้น
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

    IF v_promo.type = 'percentage' AND COALESCE(v_promo.discount_percent, 0) > 0 THEN
      IF v_promo.menu_item_id IS NULL
         AND v_promo.start_time IS NULL AND v_promo.end_time IS NULL THEN
        -- ลดทั้งบิล
        v_value := ROUND(r_subtotal * v_promo.discount_percent / 100.0, 0);
      ELSE
        -- ลดเฉพาะเมนูที่ระบุ และ/หรือเฉพาะรายการที่สั่งในช่วงเวลาโปร
        SELECT COALESCE(SUM(ROUND(oi.quantity * oi.unit_price * v_promo.discount_percent / 100.0, 0)), 0)
        INTO v_value
        FROM order_items oi
        WHERE oi.order_id = p_order_id AND oi.org_id = v_org_id AND oi.status <> 'voided'
          AND (v_promo.menu_item_id IS NULL OR oi.menu_item_id = v_promo.menu_item_id)
          AND (v_promo.start_time IS NULL OR v_promo.end_time IS NULL
               OR ((oi.created_at AT TIME ZONE c_store_tz)::TIME >= v_promo.start_time
                   AND (oi.created_at AT TIME ZONE c_store_tz)::TIME <  v_promo.end_time));
      END IF;

    ELSIF v_promo.type = 'fixed' THEN
      v_value := COALESCE(v_promo.discount_amount, 0);

    ELSIF v_promo.type = 'buy_x_get_y'
          AND COALESCE(v_promo.buy_qty, 0) > 0 AND COALESCE(v_promo.free_qty, 0) > 0 THEN
      v_set_size := v_promo.buy_qty + v_promo.free_qty;

      -- จัดกลุ่มตามเมนู แล้วคิดของแถมเป็นชุด
      WITH grouped AS (
        SELECT oi.menu_item_id, mi.name,
               SUM(oi.quantity)::INT AS qty,
               MIN(oi.unit_price)    AS price
        FROM order_items oi
        JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id = p_order_id AND oi.org_id = v_org_id AND oi.status <> 'voided'
          AND (v_promo.menu_item_id IS NULL OR oi.menu_item_id = v_promo.menu_item_id)
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

  -- ส่วนลดรวมห้ามเกินยอดบิล
  r_promo_disc := LEAST(r_promo_disc, r_subtotal);

  -- 3.5 แต้ม — clamp กับแต้มที่มีจริง (ล็อกแถวสมาชิกกันแข่งกันใช้แต้มพร้อมกัน)
  IF v_phone IS NOT NULL THEN
    SELECT lm.points INTO v_member_pts
    FROM loyalty_members lm WHERE lm.phone_number = v_phone AND lm.org_id = v_org_id FOR UPDATE;
  END IF;

  IF v_member_pts IS NOT NULL THEN
    r_points_red := GREATEST(
      0,
      LEAST(COALESCE(p_points_redeem, 0), v_member_pts, FLOOR(r_subtotal - r_promo_disc)::INT)
    );
  END IF;

  -- 3.6 ยอดสุทธิ + แต้มที่ได้รับ
  r_net := GREATEST(r_subtotal - r_promo_disc - r_points_red, 0);

  IF v_member_pts IS NOT NULL THEN
    r_points_earn := FLOOR(r_net / c_points_per_baht)::INT;
  END IF;

  -- 3.7 แยกยอดตามที่จ่ายจริง — เงินสดที่เกินคือเงินทอน ไม่ใช่ยอดขาย
  r_cash      := LEAST(v_cash_in, r_net);
  r_promptpay := r_net - r_cash;
  r_change    := GREATEST(v_cash_in - r_net, 0);
  r_method    := CASE WHEN r_cash >= r_net THEN 'cash'
                      WHEN r_cash = 0      THEN 'promptpay'
                      ELSE 'mixed' END;

  -- 3.8 บันทึก
  INSERT INTO payments (
    order_id, payment_method, subtotal, discount_amount, net_amount,
    points_earned, points_redeemed, cash_amount, promptpay_amount, phone_number, org_id
  ) VALUES (
    p_order_id, r_method, r_subtotal, r_promo_disc + r_points_red, r_net,
    r_points_earn, r_points_red, r_cash, r_promptpay, v_phone, v_org_id
  ) RETURNING id INTO r_payment_id;

  INSERT INTO payment_promotions (
    payment_id, promotion_id, promotion_name, promotion_type, discount_value, free_items, org_id
  )
  SELECT r_payment_id,
         (e->>'promotion_id')::INT,
         e->>'promotion_name',
         e->>'promotion_type',
         (e->>'discount_value')::DECIMAL(10,2),
         e->'free_items',
         v_org_id
  FROM jsonb_array_elements(r_applied) e;

  UPDATE orders      SET status = 'completed' WHERE id = p_order_id AND org_id = v_org_id;
  UPDATE order_items SET status = 'served'
  WHERE order_id = p_order_id AND org_id = v_org_id AND order_items.status = 'pending';
  UPDATE tables      SET status = 'vacant'    WHERE id = v_table_id AND org_id = v_org_id;
  UPDATE qr_sessions SET status = 'expired', expired_at = NOW()
  WHERE table_id = v_table_id AND org_id = v_org_id AND qr_sessions.status = 'active';

  IF v_member_pts IS NOT NULL THEN
    UPDATE loyalty_members
    SET points = points + r_points_earn - r_points_red
    WHERE phone_number = v_phone AND org_id = v_org_id;
  END IF;

  RETURN QUERY SELECT 'ok'::TEXT, r_payment_id, r_subtotal, r_promo_disc, r_points_red,
                      r_promo_disc + r_points_red, r_net, r_points_earn,
                      r_cash, r_promptpay, r_change, r_method, r_applied;
END;
$fn$;

COMMENT ON FUNCTION public.complete_checkout(INT, DECIMAL, VARCHAR, VARCHAR, INT) IS
  'ปิดบิล — ยอดเงินทุกตัวคำนวณจาก order_items + promotions ใน DB + ตรวจ org_id ตรงกับ JWT';

REVOKE EXECUTE ON FUNCTION public.complete_checkout(INT, DECIMAL, VARCHAR, VARCHAR, INT)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.complete_checkout(INT, DECIMAL, VARCHAR, VARCHAR, INT)
  TO authenticated, service_role;

-- -------------------------------------------------------------
-- 6. void_order_item
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.void_order_item(
  p_order_item_id INT,
  p_reason_code   TEXT,
  p_reason_note   TEXT DEFAULT NULL,
  p_void_quantity INT  DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_jwt_org       UUID := public.jwt_org_id();
  v_org_id        UUID;
  v_menu_item_id  INT;
  v_quantity      INT;
  v_unit_price    DECIMAL(10, 2);
  v_menu_name     VARCHAR(100);
  v_order_id      INT;
  v_item_status   VARCHAR(20);
  v_table_id      UUID;
  v_tracked       BOOLEAN;
  v_void_qty      INT;
  v_remaining     INT;
  v_restore       BOOLEAN;
  v_label         TEXT;
  v_reason        TEXT;
  v_note          TEXT := NULLIF(TRIM(COALESCE(p_reason_note, '')), '');
BEGIN
  -- 5.1 รหัสเหตุผล → ป้ายกำกับ + คืนสต็อกหรือไม่
  CASE p_reason_code
    WHEN 'wrong_key'        THEN v_label := 'คีย์ออเดอร์ผิด';      v_restore := TRUE;
    WHEN 'customer_changed' THEN v_label := 'ลูกค้าเปลี่ยนใจ';      v_restore := FALSE;
    WHEN 'cooking_error'    THEN v_label := 'ทำอาหารผิดพลาด';      v_restore := FALSE;
    WHEN 'too_slow'         THEN v_label := 'รอนานเกินไป';         v_restore := FALSE;
    WHEN 'out_of_stock'     THEN v_label := 'วัตถุดิบหมดกลางคัน';   v_restore := FALSE;
    WHEN 'other'            THEN v_label := 'อื่นๆ';               v_restore := FALSE;
    ELSE RETURN FALSE;
  END CASE;

  IF p_reason_code = 'other' AND v_note IS NULL THEN
    RETURN FALSE;
  END IF;

  v_reason := LEFT(v_label || COALESCE(' — ' || v_note, ''), 255);

  -- 5.2 ล็อกรายการที่จะ void
  SELECT oi.menu_item_id, oi.quantity, oi.unit_price, oi.order_id, oi.status, oi.org_id
  INTO v_menu_item_id, v_quantity, v_unit_price, v_order_id, v_item_status, v_org_id
  FROM order_items oi WHERE oi.id = p_order_item_id FOR UPDATE;

  IF v_menu_item_id IS NULL OR v_item_status = 'voided' THEN
    RETURN FALSE;
  END IF;

  IF v_jwt_org IS NOT NULL AND v_org_id <> v_jwt_org THEN
    RETURN FALSE;
  END IF;

  IF p_void_quantity IS NULL OR p_void_quantity >= v_quantity THEN
    v_void_qty := v_quantity;
  ELSIF p_void_quantity < 1 THEN
    RETURN FALSE;
  ELSE
    v_void_qty := p_void_quantity;
  END IF;

  SELECT mi.name, COALESCE(mi.is_stock_tracked, TRUE)
  INTO v_menu_name, v_tracked
  FROM menu_items mi WHERE mi.id = v_menu_item_id AND mi.org_id = v_org_id;

  IF v_restore AND v_tracked THEN
    UPDATE menu_items SET stock = stock + v_void_qty WHERE id = v_menu_item_id AND org_id = v_org_id;
  END IF;

  IF v_void_qty >= v_quantity THEN
    UPDATE order_items SET status = 'voided' WHERE id = p_order_item_id AND org_id = v_org_id;
  ELSE
    UPDATE order_items SET quantity = quantity - v_void_qty WHERE id = p_order_item_id AND org_id = v_org_id;
  END IF;

  -- 5.3 audit — ตัวตนมาจาก JWT ไม่ใช่จากผู้เรียก (A7.6)
  INSERT INTO void_logs (
    employee_id, employee_name, menu_name, quantity, total_amount,
    reason, reason_code, restored_stock, org_id
  ) VALUES (
    public.jwt_emp_id(),
    COALESCE(NULLIF(public.jwt_emp_name(), ''), 'ระบบ'),
    v_menu_name, v_void_qty, v_void_qty * v_unit_price,
    v_reason, p_reason_code, (v_restore AND v_tracked),
    v_org_id
  );

  -- 5.4 ถ้าไม่เหลือรายการที่ยังไม่ถูก void แล้ว = ปิดบิลทิ้งและคืนโต๊ะ
  IF v_void_qty >= v_quantity THEN
    SELECT COUNT(*) INTO v_remaining
    FROM order_items oi WHERE oi.order_id = v_order_id AND oi.org_id = v_org_id AND oi.status <> 'voided';

    IF v_remaining = 0 THEN
      UPDATE orders SET status = 'voided' WHERE id = v_order_id AND org_id = v_org_id
      RETURNING table_id INTO v_table_id;
      UPDATE tables SET status = 'vacant' WHERE id = v_table_id AND org_id = v_org_id;
    END IF;
  END IF;

  RETURN TRUE;
END;
$fn$;

COMMENT ON FUNCTION public.void_order_item(INT, TEXT, TEXT, INT) IS
  'ยกเลิกรายการ — คืนสต็อกตามรหัสเหตุผล บันทึก audit และตรวจ org_id ตรงกับ JWT';

REVOKE EXECUTE ON FUNCTION public.void_order_item(INT, TEXT, TEXT, INT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.void_order_item(INT, TEXT, TEXT, INT)
  TO authenticated, service_role;

-- -------------------------------------------------------------
-- 7. adjust_loyalty_points
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_loyalty_points(
  p_phone_number VARCHAR(10),
  p_adjustment   INT,
  p_reason       TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org    UUID := public.jwt_org_id();
  v_old    INT;
  v_new    INT;
  v_actual INT;
  v_reason TEXT;
  v_actor  TEXT;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_reason := NULLIF(TRIM(p_reason), '');
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'invalid_reason';
  END IF;

  IF p_adjustment = 0 THEN
    RAISE EXCEPTION 'invalid_adjustment';
  END IF;

  SELECT lm.points INTO v_old
  FROM loyalty_members lm
  WHERE lm.phone_number = p_phone_number AND lm.org_id = v_org
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  v_new := GREATEST(0, v_old + p_adjustment);
  v_actual := v_new - v_old;
  v_actor := COALESCE(public.jwt_emp_name(), 'owner');

  UPDATE loyalty_members
  SET points = v_new
  WHERE phone_number = p_phone_number AND org_id = v_org;

  INSERT INTO points_logs (phone_number, adjustment, reason, adjusted_by, org_id)
  VALUES (p_phone_number, v_actual, v_reason, v_actor, v_org);

  RETURN jsonb_build_object(
    'phone_number', p_phone_number,
    'points', v_new,
    'adjustment', v_actual
  );
END;
$fn$;

COMMENT ON FUNCTION public.adjust_loyalty_points(VARCHAR, INT, TEXT) IS
  'ปรับแต้มสมาชิกใน transaction เดียว — ล็อกแถว + audit จาก JWT + ตรวจ org_id';

REVOKE EXECUTE ON FUNCTION public.adjust_loyalty_points(VARCHAR, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_loyalty_points(VARCHAR, INT, TEXT) TO authenticated, service_role;

-- -------------------------------------------------------------
-- 8. upsert_purchase_order
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_purchase_order(
  p_order_id       BIGINT,
  p_purchase_date  DATE,
  p_buyer_name     VARCHAR(255),
  p_note           TEXT,
  p_items          JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org        UUID := public.jwt_org_id();
  v_order_id   BIGINT;
  v_total      DECIMAL(10, 2);
  v_line       RECORD;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_buyer_name IS NULL OR TRIM(p_buyer_name) = '' THEN
    RAISE EXCEPTION 'invalid_buyer';
  END IF;

  SELECT COALESCE(SUM(p.line_cost), 0) INTO v_total
  FROM public._parse_po_items_json(p_items) p;

  IF p_order_id IS NULL THEN
    INSERT INTO purchase_orders (purchase_date, buyer_name, total_cost, note, org_id)
    VALUES (p_purchase_date, TRIM(p_buyer_name), v_total, NULLIF(TRIM(p_note), ''), v_org)
    RETURNING id INTO v_order_id;
  ELSE
    v_order_id := p_order_id;

    PERFORM 1 FROM purchase_orders WHERE id = v_order_id AND org_id = v_org FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'order_not_found';
    END IF;

    UPDATE purchase_orders
    SET purchase_date = p_purchase_date,
        buyer_name    = TRIM(p_buyer_name),
        total_cost    = v_total,
        note          = NULLIF(TRIM(p_note), '')
    WHERE id = v_order_id AND org_id = v_org;

    -- ลบแถวที่ client ไม่ส่ง id กลับมา (แทนลบทั้งก้อนแล้ว insert ใหม่)
    DELETE FROM item_ingredients ii
    WHERE ii.purchase_order_id = v_order_id
      AND ii.org_id = v_org
      AND ii.id NOT IN (
        SELECT p.item_id
        FROM public._parse_po_items_json(p_items) p
        WHERE p.item_id IS NOT NULL
      );
  END IF;

  FOR v_line IN
    SELECT p.ord, p.item_id, p.name, p.quantity, p.unit, p.price_per_unit, p.line_cost
    FROM public._parse_po_items_json(p_items) p
    ORDER BY p.ord
  LOOP
    IF v_line.item_id IS NOT NULL THEN
      UPDATE item_ingredients ii
      SET name           = v_line.name,
          quantity       = v_line.quantity,
          unit           = v_line.unit,
          price_per_unit = v_line.price_per_unit,
          cost           = v_line.line_cost,
          purchase_date  = p_purchase_date,
          buyer_name     = TRIM(p_buyer_name)
      WHERE ii.id = v_line.item_id AND ii.purchase_order_id = v_order_id AND ii.org_id = v_org;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'item_not_found:%', v_line.item_id;
      END IF;
    ELSE
      INSERT INTO item_ingredients (
        purchase_order_id, name, quantity, unit, price_per_unit, cost,
        purchase_date, buyer_name, org_id
      )
      VALUES (
        v_order_id, v_line.name, v_line.quantity, v_line.unit,
        v_line.price_per_unit, v_line.line_cost,
        p_purchase_date, TRIM(p_buyer_name), v_org
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total_cost', v_total,
    'item_count', jsonb_array_length(p_items)
  );
END;
$fn$;

COMMENT ON FUNCTION public.upsert_purchase_order(BIGINT, DATE, VARCHAR, TEXT, JSONB) IS
  'สร้าง/แก้ PO + รายการวัตถุดิบใน transaction เดียว (L6) + stamp org_id จาก JWT';

REVOKE EXECUTE ON FUNCTION public.upsert_purchase_order(BIGINT, DATE, VARCHAR, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_purchase_order(BIGINT, DATE, VARCHAR, TEXT, JSONB) TO authenticated, service_role;

-- -------------------------------------------------------------
-- 9. admin_add_employee
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_add_employee(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_add_employee(
  p_name   TEXT,
  p_pin    TEXT,
  p_role   TEXT,
  p_org_id UUID
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $fn$
DECLARE v_id INT;
BEGIN
  IF p_org_id IS NULL OR NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'invalid_org';
  END IF;
  IF p_role NOT IN ('owner', 'staff') THEN RAISE EXCEPTION 'invalid_role'; END IF;
  IF p_name IS NULL OR TRIM(p_name) = ''  THEN RAISE EXCEPTION 'empty_name';   END IF;
  IF p_pin  IS NULL OR p_pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'invalid_pin'; END IF;
  IF public.pin_taken(p_pin) THEN RETURN -1; END IF;

  INSERT INTO employees (name, role, pin_bcrypt, org_id)
  VALUES (TRIM(p_name), p_role, crypt(p_pin, gen_salt('bf', 10)), p_org_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

COMMENT ON FUNCTION public.admin_add_employee(TEXT, TEXT, TEXT, UUID) IS
  'เพิ่มพนักงานพร้อม org_id — service_role เท่านั้น';

REVOKE EXECUTE ON FUNCTION public.admin_add_employee(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_employee(TEXT, TEXT, TEXT, UUID) TO service_role;

COMMIT;
