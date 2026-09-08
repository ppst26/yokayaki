-- =============================================================
-- M6 / G7 — Double points day
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
-- G7-1 — is_double_points_active
-- -------------------------------------------------------------
DO $$
DECLARE
  v_today TEXT;
  v_ok    BOOLEAN;
BEGIN
  v_today := (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE::TEXT;

  UPDATE org_settings
  SET double_points_enabled = TRUE,
      double_points_dates = jsonb_build_array(v_today)
  WHERE org_id = '00000000-0000-4000-8000-000000000001';

  v_ok := public.is_double_points_active('00000000-0000-4000-8000-000000000001');
  IF NOT v_ok THEN
    RAISE EXCEPTION 'G7-1 ไม่ผ่าน: วันนี้ควร active (today=%)', v_today;
  END IF;

  UPDATE org_settings
  SET double_points_enabled = FALSE
  WHERE org_id = '00000000-0000-4000-8000-000000000001';

  IF public.is_double_points_active('00000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'G7-1 ไม่ผ่าน: ปิด enabled แล้วต้องเป็น false';
  END IF;

  RAISE NOTICE 'PASS  G7-1 · is_double_points_active ทำงาน (today=%)', v_today;
END
$$;

-- -------------------------------------------------------------
-- G7-2 — complete_checkout ให้แต้ม x2 ในวัน double points
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu   INT;
  v_order  INT;
  v_tbl    UUID := pg_temp.table_id(1);
  v_phone  TEXT := '0888888871';
  v_res    RECORD;
  v_today  TEXT;
  v_base   INT;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  v_today := (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE::TEXT;

  UPDATE org_settings
  SET double_points_enabled = TRUE,
      double_points_dates = jsonb_build_array(v_today)
  WHERE org_id = '00000000-0000-4000-8000-000000000001';

  INSERT INTO loyalty_members (org_id, phone_number, name, points)
  VALUES ('00000000-0000-4000-8000-000000000001', v_phone, 'ทดสอบ G7', 0)
  ON CONFLICT (org_id, phone_number) DO UPDATE SET points = 0;

  SELECT id INTO v_menu FROM menu_items WHERE org_id = '00000000-0000-4000-8000-000000000001' ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu;

  PERFORM pg_temp.reset_table(v_tbl);
  PERFORM public.place_order_item(v_tbl, v_menu, 2, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = v_tbl AND o.status = 'active';

  SELECT * INTO v_res FROM public.complete_checkout(v_order, 0, NULL, v_phone, 0);

  IF v_res.status <> 'ok' THEN
    RAISE EXCEPTION 'G7-2 ไม่ผ่าน: checkout status %', v_res.status;
  END IF;

  v_base := FLOOR(v_res.net_amount / 10)::INT;
  IF v_res.points_earned IS DISTINCT FROM v_base * 2 THEN
    RAISE EXCEPTION 'G7-2 ไม่ผ่าน: ได้แต้ม % ควรเป็น % (net %)',
      v_res.points_earned, v_base * 2, v_res.net_amount;
  END IF;

  UPDATE org_settings SET double_points_enabled = FALSE
  WHERE org_id = '00000000-0000-4000-8000-000000000001';

  RAISE NOTICE 'PASS  G7-2 · complete_checkout แต้ม x2 (earned=% net=%)', v_res.points_earned, v_res.net_amount;
END
$$;

-- -------------------------------------------------------------
-- G7-3 — update_double_points_settings (owner)
-- -------------------------------------------------------------
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  PERFORM public.update_double_points_settings(TRUE, '["2099-01-01"]'::JSONB);

  IF NOT EXISTS (
    SELECT 1 FROM org_settings
    WHERE org_id = '00000000-0000-4000-8000-000000000001'
      AND double_points_enabled = TRUE
      AND double_points_dates = '["2099-01-01"]'::JSONB
  ) THEN
    RAISE EXCEPTION 'G7-3 ไม่ผ่าน: RPC ไม่บันทึก settings';
  END IF;

  PERFORM public.update_double_points_settings(FALSE, '[]'::JSONB);

  RAISE NOTICE 'PASS  G7-3 · update_double_points_settings';
END
$$;

ROLLBACK;
