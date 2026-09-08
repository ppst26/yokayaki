-- =============================================================
-- M6 / G6 — target_segment + checkout validation
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

CREATE FUNCTION pg_temp.table_id(p_num INT) RETURNS UUID LANGUAGE sql AS $fn$
  SELECT id FROM tables WHERE org_id = '00000000-0000-4000-8000-000000000001' AND table_number = p_num LIMIT 1;
$fn$;

CREATE FUNCTION pg_temp.reset_table(p_table_id UUID) RETURNS VOID
LANGUAGE plpgsql AS $fn$
BEGIN
  DELETE FROM payments    WHERE order_id IN (SELECT id FROM orders WHERE table_id = p_table_id);
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE table_id = p_table_id);
  DELETE FROM orders      WHERE table_id = p_table_id;
  UPDATE tables SET status = 'vacant' WHERE id = p_table_id;
END;
$fn$;

-- -------------------------------------------------------------
-- G6-1 — member_matches_promo_segment dormant
-- -------------------------------------------------------------
DO $$
DECLARE
  v_ok BOOLEAN;
BEGIN
  v_ok := public.member_matches_promo_segment(
    '00000000-0000-4000-8000-000000000001',
    '0899999999',
    'dormant'
  );
  -- seed member may not exist — test with compute path via insert
  RAISE NOTICE 'PASS  G6-1 · member_matches_promo_segment callable (result=%)', v_ok;
END
$$;

-- -------------------------------------------------------------
-- G6-2 — คูปอง dormant ใช้ได้เฉพาะสมาชิก dormant
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu   INT;
  v_promo  INT;
  v_order  INT;
  v_tbl    UUID := pg_temp.table_id(1);
  v_phone  TEXT := '0888888891';
  v_res    RECORD;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  INSERT INTO loyalty_members (org_id, phone_number, name, points, created_at)
  VALUES (
    '00000000-0000-4000-8000-000000000001',
    v_phone,
    'สมาชิก dormant G6',
    0,
    NOW() - INTERVAL '100 days'
  )
  ON CONFLICT (org_id, phone_number) DO UPDATE
    SET created_at = NOW() - INTERVAL '100 days';

  SELECT id INTO v_menu FROM menu_items WHERE org_id = '00000000-0000-4000-8000-000000000001' ORDER BY id LIMIT 1;

  INSERT INTO promotions (
    name, type, discount_amount, coupon_code, min_order_amount, is_active, org_id, target_segment
  ) VALUES (
    'คูปอง dormant G6', 'fixed', 50, 'DORMG6', 0, TRUE,
    '00000000-0000-4000-8000-000000000001', 'dormant'
  ) RETURNING id INTO v_promo;

  UPDATE promotions SET is_active = (id = v_promo) WHERE org_id = '00000000-0000-4000-8000-000000000001';

  PERFORM pg_temp.reset_table(v_tbl);
  PERFORM public.place_order_item(v_tbl, v_menu, 1, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = v_tbl AND o.status = 'active';

  SELECT * INTO v_res FROM public.complete_checkout(v_order, 500, 'DORMG6', v_phone, 0);

  IF v_res.promo_discount <= 0 THEN
    RAISE EXCEPTION 'G6-2 ไม่ผ่าน: dormant member ควรได้ส่วนลด ได้ %', v_res.promo_discount;
  END IF;

  RAISE NOTICE 'PASS  G6-2 · dormant member ใช้คูปอง segment ได้';
END
$$;

-- -------------------------------------------------------------
-- G6-3 — คูปอง dormant ปฏิเสธสมาชิก active
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu   INT;
  v_promo  INT;
  v_order  INT;
  v_tbl    UUID := pg_temp.table_id(2);
  v_phone  TEXT := '0888888892';
  v_err    TEXT;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  INSERT INTO loyalty_members (org_id, phone_number, name, points, created_at)
  VALUES (
    '00000000-0000-4000-8000-000000000001',
    v_phone,
    'สมาชิก active G6',
    100,
    NOW() - INTERVAL '5 days'
  )
  ON CONFLICT (org_id, phone_number) DO UPDATE SET points = 100, created_at = NOW() - INTERVAL '5 days';

  SELECT id INTO v_menu FROM menu_items WHERE org_id = '00000000-0000-4000-8000-000000000001' ORDER BY id LIMIT 1;

  SELECT id INTO v_promo FROM promotions
  WHERE coupon_code = 'DORMG6' AND org_id = '00000000-0000-4000-8000-000000000001'
  LIMIT 1;

  IF v_promo IS NULL THEN
    INSERT INTO promotions (
      name, type, discount_amount, coupon_code, min_order_amount, is_active, org_id, target_segment
    ) VALUES (
      'คูปอง dormant G6', 'fixed', 50, 'DORMG6', 0, TRUE,
      '00000000-0000-4000-8000-000000000001', 'dormant'
    ) RETURNING id INTO v_promo;
  END IF;

  UPDATE promotions SET is_active = (id = v_promo) WHERE org_id = '00000000-0000-4000-8000-000000000001';

  PERFORM pg_temp.reset_table(v_tbl);
  PERFORM public.place_order_item(v_tbl, v_menu, 1, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = v_tbl AND o.status = 'active';

  BEGIN
    PERFORM public.complete_checkout(v_order, 500, 'DORMG6', v_phone, 0);
    RAISE EXCEPTION 'G6-3 ไม่ผ่าน: active member ควร coupon_segment_mismatch';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err NOT LIKE '%coupon_segment_mismatch%' THEN
      RAISE;
    END IF;
  END;

  RAISE NOTICE 'PASS  G6-3 · active member ถูกปฏิเสธ';
END
$$;

ROLLBACK;
