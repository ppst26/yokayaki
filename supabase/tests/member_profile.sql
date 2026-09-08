-- =============================================================
-- M6 / G1 — get_member_profile · list_member_summaries
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
-- G1-1 — get_member_profile คำนวณสถิติ + เมนูโปรด
-- -------------------------------------------------------------
DO $$
DECLARE
  v_phone    TEXT := '0888888881';
  v_menu_a   INT;
  v_menu_b   INT;
  v_tbl1     UUID := pg_temp.table_id(1);
  v_tbl2     UUID := pg_temp.table_id(2);
  v_order    INT;
  v_profile  JSONB;
  v_stats    JSONB;
  v_favs     JSONB;
  v_bills    JSONB;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  SELECT id INTO v_menu_a FROM menu_items WHERE org_id = '00000000-0000-4000-8000-000000000001' ORDER BY id LIMIT 1;
  SELECT id INTO v_menu_b FROM menu_items WHERE org_id = '00000000-0000-4000-8000-000000000001' ORDER BY id OFFSET 1 LIMIT 1;

  INSERT INTO loyalty_members (org_id, phone_number, name, points)
  VALUES ('00000000-0000-4000-8000-000000000001', v_phone, 'สมาชิก G1', 50)
  ON CONFLICT (org_id, phone_number) DO UPDATE SET name = 'สมาชิก G1', points = 50;

  -- บิล 1: menu_a x2 → net จาก complete_checkout
  PERFORM pg_temp.reset_table(v_tbl1);
  PERFORM public.place_order_item(v_tbl1, v_menu_a, 2, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = v_tbl1 AND o.status = 'active';
  PERFORM public.complete_checkout(v_order, 500, NULL, v_phone, 0);

  -- บิล 2: menu_a x1 + menu_b x3
  PERFORM pg_temp.reset_table(v_tbl2);
  PERFORM public.place_order_item(v_tbl2, v_menu_a, 1, NULL);
  PERFORM public.place_order_item(v_tbl2, v_menu_b, 3, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = v_tbl2 AND o.status = 'active';
  PERFORM public.complete_checkout(v_order, 1000, NULL, v_phone, 10);

  PERFORM public.adjust_loyalty_points(v_phone, 5, 'ทดสอบ G1 manual');

  v_profile := public.get_member_profile(v_phone);
  v_stats := v_profile -> 'stats';
  v_favs := v_profile -> 'favorite_menus';
  v_bills := v_profile -> 'bills';

  IF (v_stats ->> 'visit_count')::INT <> 2 THEN
    RAISE EXCEPTION 'G1-1 ไม่ผ่าน: visit_count ควรเป็น 2 ได้ %', v_stats ->> 'visit_count';
  END IF;

  IF (v_stats ->> 'lifetime_spend')::DECIMAL <= 0 THEN
    RAISE EXCEPTION 'G1-1 ไม่ผ่าน: lifetime_spend ควร > 0 ได้ %', v_stats ->> 'lifetime_spend';
  END IF;

  IF v_stats ->> 'last_visit_at' IS NULL THEN
    RAISE EXCEPTION 'G1-1 ไม่ผ่าน: last_visit_at ต้องไม่เป็น null';
  END IF;

  IF (v_stats ->> 'avg_per_bill')::DECIMAL <= 0 THEN
    RAISE EXCEPTION 'G1-1 ไม่ผ่าน: avg_per_bill ควร > 0';
  END IF;

  IF jsonb_array_length(v_favs) < 1 THEN
    RAISE EXCEPTION 'G1-1 ไม่ผ่าน: favorite_menus ต้องมีอย่างน้อย 1 รายการ';
  END IF;

  IF (v_favs -> 0 ->> 'total_quantity')::INT < (v_favs -> COALESCE(jsonb_array_length(v_favs) - 1, 0) ->> 'total_quantity')::INT THEN
    RAISE EXCEPTION 'G1-1 ไม่ผ่าน: favorite_menus ต้องเรียงตาม quantity มากไปน้อย';
  END IF;

  IF jsonb_array_length(v_bills) <> 2 THEN
    RAISE EXCEPTION 'G1-1 ไม่ผ่าน: bills ควรมี 2 รายการ ได้ %', jsonb_array_length(v_bills);
  END IF;

  IF jsonb_array_length(v_profile -> 'points_logs') < 1 THEN
    RAISE EXCEPTION 'G1-1 ไม่ผ่าน: points_logs ต้องมี manual adjustment';
  END IF;

  RAISE NOTICE 'PASS  G1-1 · get_member_profile สถิติ + เมนูโปรด + บิล + logs';
END
$$;

-- -------------------------------------------------------------
-- G1-2 — member_not_found ข้าม org
-- -------------------------------------------------------------
DO $$
DECLARE
  v_profile JSONB;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  BEGIN
    v_profile := public.get_member_profile('0000000000');
    RAISE EXCEPTION 'G1-2 ไม่ผ่าน: ควร throw member_not_found';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%member_not_found%' THEN
      RAISE;
    END IF;
  END;

  RAISE NOTICE 'PASS  G1-2 · member_not_found เมื่อไม่มีสมาชิก';
END
$$;

-- -------------------------------------------------------------
-- G1-3 — forbidden สำหรับ role ที่ไม่มีสิทธิ์ loyalty
-- -------------------------------------------------------------
DO $$
DECLARE
  v_profile JSONB;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":2,"emp_name":"ครัว","emp_role":"kitchen","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  BEGIN
    v_profile := public.get_member_profile('0888888881');
    RAISE EXCEPTION 'G1-3 ไม่ผ่าน: kitchen ควร forbidden';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%forbidden%' THEN
      RAISE;
    END IF;
  END;

  RAISE NOTICE 'PASS  G1-3 · forbidden สำหรับ kitchen';
END
$$;

-- -------------------------------------------------------------
-- G1-4 — list_member_summaries คืนสรุปต่อสมาชิก
-- -------------------------------------------------------------
DO $$
DECLARE
  v_summaries JSONB;
  v_row       JSONB;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  v_summaries := public.list_member_summaries();

  SELECT elem INTO v_row
  FROM jsonb_array_elements(v_summaries) elem
  WHERE elem ->> 'phone_number' = '0888888881'
  LIMIT 1;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'G1-4 ไม่ผ่าน: ไม่พบสรุปของสมาชิกทดสอบ';
  END IF;

  IF (v_row ->> 'visit_count')::INT <> 2 THEN
    RAISE EXCEPTION 'G1-4 ไม่ผ่าน: visit_count ใน summary ควรเป็น 2 ได้ %', v_row ->> 'visit_count';
  END IF;

  RAISE NOTICE 'PASS  G1-4 · list_member_summaries';
END
$$;

ROLLBACK;
