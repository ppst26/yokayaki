BEGIN;

-- =============================================================
-- M6 / G6 — โปรเจาะกลุ่ม: target_segment + ตรวจตอน checkout
-- =============================================================

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS target_segment VARCHAR(32) DEFAULT NULL;

ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_target_segment_check;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_target_segment_check
  CHECK (
    target_segment IS NULL
    OR target_segment IN (
      'all', 'new', 'regular', 'vip', 'dormant', 'rfm_a', 'rfm_b', 'rfm_c'
    )
  );

CREATE OR REPLACE FUNCTION public.member_matches_promo_segment(
  p_org_id    UUID,
  p_phone     VARCHAR(10),
  p_segment   VARCHAR(32)
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $seg$
DECLARE
  v_member      loyalty_members%ROWTYPE;
  v_visit_count INT;
  v_lifetime    DECIMAL(10, 2);
  v_last_visit  TIMESTAMPTZ;
  v_tags        JSONB;
  v_rfm         JSONB;
BEGIN
  IF p_segment IS NULL OR p_segment = 'all' THEN
    RETURN TRUE;
  END IF;

  IF p_phone IS NULL OR p_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_member
  FROM loyalty_members lm
  WHERE lm.org_id = p_org_id AND lm.phone_number = p_phone;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT
    COALESCE(SUM(p.net_amount), 0),
    COUNT(*)::INT,
    MAX(p.created_at)
  INTO v_lifetime, v_visit_count, v_last_visit
  FROM payments p
  WHERE p.org_id = p_org_id AND p.phone_number = p_phone;

  v_tags := public.compute_member_tags(
    v_visit_count, v_lifetime, v_last_visit, v_member.created_at
  );
  v_rfm := public.compute_member_rfm(
    v_visit_count, v_lifetime, v_last_visit, v_member.created_at
  );

  CASE p_segment
    WHEN 'new'     THEN RETURN v_tags @> '["new"]'::JSONB;
    WHEN 'regular' THEN RETURN v_tags @> '["regular"]'::JSONB;
    WHEN 'vip'     THEN RETURN v_tags @> '["vip"]'::JSONB;
    WHEN 'dormant' THEN RETURN v_tags @> '["dormant"]'::JSONB;
    WHEN 'rfm_a'   THEN RETURN (v_rfm ->> 'segment') = 'A';
    WHEN 'rfm_b'   THEN RETURN (v_rfm ->> 'segment') = 'B';
    WHEN 'rfm_c'   THEN RETURN (v_rfm ->> 'segment') = 'C';
    ELSE RETURN FALSE;
  END CASE;
END;
$seg$;

CREATE OR REPLACE FUNCTION public.assert_coupon_segment_match(
  p_org_id    UUID,
  p_phone     VARCHAR(10),
  p_segment   VARCHAR(32)
) RETURNS VOID
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $assert$
BEGIN
  IF p_segment IS NULL OR p_segment = 'all' THEN
    RETURN;
  END IF;

  IF p_phone IS NULL THEN
    RAISE EXCEPTION 'coupon_requires_member';
  END IF;

  IF NOT public.member_matches_promo_segment(p_org_id, p_phone, p_segment) THEN
    RAISE EXCEPTION 'coupon_segment_mismatch';
  END IF;
END;
$assert$;

REVOKE EXECUTE ON FUNCTION public.member_matches_promo_segment(UUID, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_matches_promo_segment(UUID, VARCHAR, VARCHAR) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.assert_coupon_segment_match(UUID, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_coupon_segment_match(UUID, VARCHAR, VARCHAR) TO authenticated, service_role;

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

  IF v_table_id IS NULL OR (v_jwt_org IS NOT NULL AND v_org_id <> v_jwt_org) OR NOT public.can_operate_pos() THEN
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
    -- G6: segment targeting
    IF v_promo.type = 'fixed' AND v_promo.coupon_code IS NOT NULL
       AND p_coupon_code IS NOT NULL
       AND UPPER(TRIM(p_coupon_code)) = UPPER(TRIM(v_promo.coupon_code)) THEN
      PERFORM public.assert_coupon_segment_match(v_org_id, v_phone, v_promo.target_segment);
    ELSIF NOT public.member_matches_promo_segment(v_org_id, v_phone, v_promo.target_segment) THEN
      CONTINUE;
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

COMMIT;
