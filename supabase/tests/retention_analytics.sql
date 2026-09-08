-- =============================================================
-- M6 / G8–G11 — get_retention_analytics
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

-- -------------------------------------------------------------
-- G11-1 — seed payments member + walk-in + promo
-- -------------------------------------------------------------
DO $$
DECLARE
  v_org   UUID := '00000000-0000-4000-8000-000000000001';
  v_order INT;
  v_pay_m INT;
  v_pay_w INT;
  v_promo INT;
  v_res   JSONB;
  v_mvw   JSONB;
  v_roi   JSONB;
  v_heat  JSONB;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  INSERT INTO loyalty_members (org_id, phone_number, name, points)
  VALUES (v_org, '0888888861', 'สมาชิก G8', 50)
  ON CONFLICT (org_id, phone_number) DO UPDATE SET points = 50;

  INSERT INTO promotions (org_id, name, type, discount_amount, is_active)
  VALUES (v_org, 'โปรทดสอบ G9', 'fixed', 50, TRUE)
  RETURNING id INTO v_promo;

  -- สร้าง orders + payments โดยตรง (ไม่ผ่าน checkout) เพื่อควบคุมตัวเลข
  INSERT INTO orders (org_id, table_id, status)
  SELECT v_org, t.id, 'completed'
  FROM tables t WHERE t.org_id = v_org AND t.table_number = 1
  RETURNING id INTO v_order;

  INSERT INTO payments (
    order_id, payment_method, subtotal, discount_amount, net_amount,
    points_earned, points_redeemed, cash_amount, promptpay_amount, phone_number, org_id, created_at
  ) VALUES (
    v_order, 'cash', 300, 50, 250, 25, 10, 250, 0, '0888888861', v_org, NOW()
  ) RETURNING id INTO v_pay_m;

  INSERT INTO payment_promotions (
    payment_id, promotion_id, promotion_name, promotion_type, discount_value, org_id
  ) VALUES (
    v_pay_m, v_promo, 'โปรทดสอบ G9', 'fixed', 50, v_org
  );

  INSERT INTO orders (org_id, table_id, status)
  SELECT v_org, t.id, 'completed'
  FROM tables t WHERE t.org_id = v_org AND t.table_number = 2
  RETURNING id INTO v_order;

  INSERT INTO payments (
    order_id, payment_method, subtotal, discount_amount, net_amount,
    points_earned, points_redeemed, cash_amount, promptpay_amount, phone_number, org_id, created_at
  ) VALUES (
    v_order, 'cash', 100, 0, 100, 0, 0, 100, 0, NULL, v_org, NOW()
  ) RETURNING id INTO v_pay_w;

  v_res := public.get_retention_analytics(NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day');
  v_mvw := v_res -> 'member_vs_walkin';
  v_roi := v_res -> 'promo_roi';
  v_heat := v_res -> 'heatmap' -> 'cells';

  IF (v_mvw -> 'member' ->> 'bills')::INT < 1 THEN
    RAISE EXCEPTION 'G8 ไม่ผ่าน: member bills = %', v_mvw -> 'member' ->> 'bills';
  END IF;
  IF (v_mvw -> 'walkin' ->> 'bills')::INT < 1 THEN
    RAISE EXCEPTION 'G8 ไม่ผ่าน: walkin bills = %', v_mvw -> 'walkin' ->> 'bills';
  END IF;
  IF (v_mvw -> 'member' ->> 'net')::NUMERIC < 250 THEN
    RAISE EXCEPTION 'G8 ไม่ผ่าน: member net = %', v_mvw -> 'member' ->> 'net';
  END IF;
  IF (v_mvw -> 'member' ->> 'points_redeemed')::INT < 10 THEN
    RAISE EXCEPTION 'G8 ไม่ผ่าน: points_redeemed = %', v_mvw -> 'member' ->> 'points_redeemed';
  END IF;

  IF jsonb_array_length(v_roi) < 1 THEN
    RAISE EXCEPTION 'G9 ไม่ผ่าน: promo_roi ว่าง';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_roi) e
    WHERE (e->>'promotion_id')::INT = v_promo
      AND (e->>'discount_total')::NUMERIC >= 50
      AND (e->>'sales_with_promo')::NUMERIC >= 250
  ) THEN
    RAISE EXCEPTION 'G9 ไม่ผ่าน: ROI แถวโปร % ไม่ตรง %', v_promo, v_roi;
  END IF;

  IF jsonb_array_length(v_heat) < 1 THEN
    RAISE EXCEPTION 'G10 ไม่ผ่าน: heatmap cells ว่าง';
  END IF;

  RAISE NOTICE 'PASS  G8–G10 · get_retention_analytics member/walkin/promo/heatmap';
END
$$;

-- -------------------------------------------------------------
-- G11-2 — staff without can_read_sales ถูกห้าม (cashier role = operate_pos only?)
-- owner ผ่านแล้ว · ทดสอบ role ที่ไม่มี can_read_sales
-- -------------------------------------------------------------
DO $$
DECLARE
  v_ok BOOLEAN := FALSE;
BEGIN
  -- kitchen ไม่มี can_read_sales ตาม M5
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":2,"emp_name":"ครัว","emp_role":"kitchen","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  BEGIN
    PERFORM public.get_retention_analytics(NOW() - INTERVAL '1 day', NOW());
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%forbidden%' THEN
      v_ok := TRUE;
    ELSE
      RAISE;
    END IF;
  END;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'G11-2 ไม่ผ่าน: kitchen ควรได้ forbidden';
  END IF;

  RAISE NOTICE 'PASS  G11-2 · kitchen ถูกห้ามเรียก get_retention_analytics';
END
$$;

ROLLBACK;
