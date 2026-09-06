-- =============================================================
-- M5 — Integration test 5-role permission matrix
--
-- พิสูจน์ RLS + RPC guards ตาม can_*() helpers — ไม่พึ่ง UI
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

CREATE FUNCTION pg_temp.set_role(p_role TEXT) RETURNS VOID
LANGUAGE plpgsql AS $fn$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object(
    'emp_id', 99,
    'emp_name', 'ทดสอบ',
    'emp_role', p_role,
    'org_id', '00000000-0000-4000-8000-000000000001'
  )::text, true);
END;
$fn$;

CREATE FUNCTION pg_temp.table_id(p_num INT) RETURNS UUID LANGUAGE sql AS $fn$
  SELECT id FROM tables WHERE org_id = '00000000-0000-4000-8000-000000000001' AND table_number = p_num LIMIT 1;
$fn$;

CREATE FUNCTION pg_temp.expect_read(p_table TEXT, p_expect TEXT) RETURNS VOID
LANGUAGE plpgsql AS $fn$
DECLARE v_n INT;
BEGIN
  EXECUTE format('SELECT COUNT(*) FROM public.%I', p_table) INTO v_n;
  IF p_expect = 'rows' AND v_n = 0 THEN
    RAISE EXCEPTION '%: คาดหวัง rows แต่ได้ zero', p_table;
  ELSIF p_expect = 'zero' AND v_n > 0 THEN
    RAISE EXCEPTION '%: คาดหวัง zero แต่เห็น % แถว', p_table, v_n;
  ELSIF p_expect = 'denied' THEN
    RAISE EXCEPTION '%: คาดหวัง denied แต่อ่านได้ % แถว', p_table, v_n;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  IF p_expect <> 'denied' THEN
    RAISE EXCEPTION '%: คาดหวัง % แต่ถูก denied', p_table, p_expect;
  END IF;
END;
$fn$;

CREATE FUNCTION pg_temp.expect_rpc_ok(p_sql TEXT) RETURNS VOID
LANGUAGE plpgsql AS $fn$
BEGIN
  EXECUTE p_sql;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'RPC ควรสำเร็จ: % — ได้ %', p_sql, SQLERRM;
END;
$fn$;

CREATE FUNCTION pg_temp.expect_rpc_error(p_sql TEXT, p_fragment TEXT) RETURNS VOID
LANGUAGE plpgsql AS $fn$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'RPC ควร error (%): %', p_fragment, p_sql;
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE ('%' || p_fragment || '%') THEN
    RAISE EXCEPTION 'RPC คาดหวัง % ได้ % — SQL: %', p_fragment, SQLERRM, p_sql;
  END IF;
END;
$fn$;

-- -------------------------------------------------------------
-- เตรียมข้อมูล: บิลที่ปิดแล้ว · ออเดอร์ active · เมนู
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu    INT;
  v_order   INT;
  v_item    INT;
  v_promo   INT;
  v_phone   TEXT := '0890000001';
  v_tbl1    UUID := pg_temp.table_id(1);
  v_tbl2    UUID := pg_temp.table_id(2);
BEGIN
  PERFORM pg_temp.set_role('owner');

  SELECT id INTO v_menu FROM menu_items
  WHERE org_id = '00000000-0000-4000-8000-000000000001' ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 500, is_stock_tracked = TRUE WHERE id = v_menu;

  INSERT INTO stock_logs (org_id, menu_item_id, menu_item_name, employee_name, old_stock, new_stock, change_amount)
  SELECT '00000000-0000-4000-8000-000000000001', v_menu, mi.name, 'ผู้ทดสอบ', 500, 505, 5
  FROM menu_items mi WHERE mi.id = v_menu AND mi.org_id = '00000000-0000-4000-8000-000000000001';

  INSERT INTO loyalty_members (org_id, phone_number, name, points)
  VALUES ('00000000-0000-4000-8000-000000000001', v_phone, 'สมาชิก role_matrix', 50)
  ON CONFLICT (org_id, phone_number) DO UPDATE SET points = 50;

  INSERT INTO promotions (org_id, name, type, discount_amount, coupon_code, min_order_amount, is_active)
  VALUES ('00000000-0000-4000-8000-000000000001', 'คูปอง role_matrix', 'fixed', 10, 'MATRIXTEST', 0, TRUE)
  RETURNING id INTO v_promo;

  UPDATE tables SET status = 'vacant' WHERE id = v_tbl1;
  PERFORM public.place_order_item(v_tbl1, v_menu, 2, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = v_tbl1 AND o.status = 'active';
  PERFORM public.complete_checkout(v_order, 1000, 'MATRIXTEST', v_phone, 0);

  UPDATE tables SET status = 'vacant' WHERE id = v_tbl2;
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE table_id = v_tbl2);
  DELETE FROM orders WHERE table_id = v_tbl2;
  PERFORM public.place_order_item(v_tbl2, v_menu, 1, 'รอ void');
  PERFORM public.place_order_item(v_tbl2, v_menu, 1, 'รอเสิร์ฟ');

  SELECT oi.id INTO v_item
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.table_id = v_tbl2 AND oi.notes = 'รอ void' AND oi.status = 'pending';

  PERFORM set_config('pg_temp.void_item_id', v_item::TEXT, TRUE);

  SELECT oi.id INTO v_item
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.table_id = v_tbl2 AND oi.notes = 'รอเสิร์ฟ' AND oi.status = 'pending';

  PERFORM set_config('pg_temp.serve_item_id', v_item::TEXT, TRUE);
  PERFORM set_config('pg_temp.menu_id', v_menu::TEXT, TRUE);
  PERFORM set_config('pg_temp.table2_id', v_tbl2::TEXT, TRUE);

  RAISE NOTICE 'setup · มี payments + order_items pending สำหรับ matrix';
END
$$;

-- -------------------------------------------------------------
-- kitchen — KDS: อ่าน order_items · ไม่อ่าน payments · ไม่สั่ง POS
-- -------------------------------------------------------------
DO $$
DECLARE
  v_void  INT := current_setting('pg_temp.void_item_id')::INT;
  v_serve INT := current_setting('pg_temp.serve_item_id')::INT;
BEGIN
  PERFORM pg_temp.set_role('kitchen');
  SET LOCAL ROLE authenticated;

  PERFORM pg_temp.expect_read('order_items', 'rows');
  PERFORM pg_temp.expect_read('orders', 'rows');
  PERFORM pg_temp.expect_read('tables', 'rows');
  PERFORM pg_temp.expect_read('payments', 'zero');
  PERFORM pg_temp.expect_read('menu_items', 'zero');
  PERFORM pg_temp.expect_read('qr_sessions', 'zero');

  RESET ROLE;

  PERFORM pg_temp.expect_rpc_error(
    format($q$SELECT public.place_order_batch('%s'::uuid, '[{"menu_item_id":%s,"quantity":1}]'::jsonb)$q$,
      current_setting('pg_temp.table2_id'), current_setting('pg_temp.menu_id')),
    'forbidden_role');

  PERFORM pg_temp.set_role('kitchen');
  PERFORM pg_temp.expect_rpc_ok(format($q$SELECT public.void_order_item(%s, 'cooking_error', NULL, NULL)$q$, v_void));

  PERFORM pg_temp.set_role('kitchen');
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_rpc_ok(
    format($q$UPDATE order_items SET status = 'served' WHERE status = 'pending' AND id = %s$q$, v_serve));
  RESET ROLE;

  RAISE NOTICE 'PASS  kitchen · อ่านครัวได้ · payments/menu/QR ไม่เห็น · POS RPC ถูกปฏิเสธ · void/serve ได้';
END
$$;

-- -------------------------------------------------------------
-- cashier — POS: สั่งได้ · ไม่อ่าน payments โดยตรง
-- -------------------------------------------------------------
DO $$
DECLARE
  v_tbl UUID := current_setting('pg_temp.table2_id')::UUID;
  v_menu INT := current_setting('pg_temp.menu_id')::INT;
  v_result JSONB;
BEGIN
  PERFORM pg_temp.set_role('cashier');
  SET LOCAL ROLE authenticated;

  PERFORM pg_temp.expect_read('tables', 'rows');
  PERFORM pg_temp.expect_read('menu_items', 'rows');
  PERFORM pg_temp.expect_read('payments', 'zero');
  PERFORM pg_temp.expect_read('payment_promotions', 'zero');
  PERFORM pg_temp.expect_read('void_logs', 'zero');
  PERFORM pg_temp.expect_read('stock_logs', 'zero');

  RESET ROLE;

  PERFORM pg_temp.expect_rpc_ok(
    format($q$SELECT public.place_order_batch('%s'::uuid, '[{"menu_item_id":%s,"quantity":1}]'::jsonb)$q$,
      v_tbl, v_menu));

  PERFORM pg_temp.set_role('cashier');
  EXECUTE format($q$SELECT public.place_order_batch('%s'::uuid, '[{"menu_item_id":%s,"quantity":1}]'::jsonb)$q$,
    v_tbl, v_menu) INTO v_result;

  IF (v_result ->> 'placed')::INT < 1 THEN
    RAISE EXCEPTION 'cashier place_order_batch ไม่สำเร็จ: %', v_result;
  END IF;

  RAISE NOTICE 'PASS  cashier · POS สั่งได้ · ตารางการเงิน/หลังร้านอ่านไม่ได้';
END
$$;

-- -------------------------------------------------------------
-- accountant — อ่านรายงาน · ไม่สั่ง/ไม่แก้เมนู
-- -------------------------------------------------------------
DO $$
DECLARE
  v_n INT;
BEGIN
  PERFORM pg_temp.set_role('accountant');
  SET LOCAL ROLE authenticated;

  PERFORM pg_temp.expect_read('payments', 'rows');
  PERFORM pg_temp.expect_read('payment_promotions', 'rows');
  PERFORM pg_temp.expect_read('void_logs', 'rows');
  PERFORM pg_temp.expect_read('menu_items', 'rows');
  PERFORM pg_temp.expect_read('tables', 'zero');
  PERFORM pg_temp.expect_read('orders', 'zero');
  PERFORM pg_temp.expect_read('order_items', 'zero');

  BEGIN
    INSERT INTO menu_items (name, price, stock, category, org_id)
    VALUES ('เมนูที่ accountant ไม่ควรเพิ่ม', 99, 0, 'ทดสอบ', '00000000-0000-4000-8000-000000000001');
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN
      RAISE EXCEPTION 'accountant INSERT menu_items ไม่ควรสำเร็จ';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%row-level security%' AND SQLSTATE <> '42501' THEN
        RAISE;
      END IF;
  END;

  RESET ROLE;

  PERFORM pg_temp.expect_rpc_error(
    format($q$SELECT public.place_order_batch('%s'::uuid, '[{"menu_item_id":%s,"quantity":1}]'::jsonb)$q$,
      current_setting('pg_temp.table2_id'), current_setting('pg_temp.menu_id')),
    'forbidden_role');

  PERFORM pg_temp.expect_rpc_error(
    $q$SELECT public.complete_checkout(
      (SELECT id FROM orders WHERE status = 'active' ORDER BY id DESC LIMIT 1),
      1000, NULL, NULL, 0)$q$,
    'forbidden_role');

  RAISE NOTICE 'PASS  accountant · อ่านการเงิน/เมนูได้ · POS/checkout ถูกปฏิเสธ · แก้เมนูไม่ได้';
END
$$;

-- -------------------------------------------------------------
-- manager — back-office + POS เหมือน owner (ยกเว้น last_owner guard ใน admin_*)
-- -------------------------------------------------------------
DO $$
BEGIN
  PERFORM pg_temp.set_role('manager');
  SET LOCAL ROLE authenticated;

  PERFORM pg_temp.expect_read('payments', 'rows');
  PERFORM pg_temp.expect_read('stock_logs', 'rows');
  PERFORM pg_temp.expect_read('menu_items', 'rows');
  PERFORM pg_temp.expect_read('tables', 'rows');

  PERFORM pg_temp.expect_rpc_ok(
    format($q$SELECT public.place_order_batch('%s'::uuid, '[{"menu_item_id":%s,"quantity":1}]'::jsonb)$q$,
      current_setting('pg_temp.table2_id'), current_setting('pg_temp.menu_id')));

  RESET ROLE;

  PERFORM pg_temp.set_role('manager');
  PERFORM pg_temp.expect_rpc_ok(
    $q$SELECT public.adjust_loyalty_points('0890000001', 1, 'manager ปรับแต้ม')$q$);

  PERFORM pg_temp.expect_rpc_ok(
    $q$SELECT public.upsert_purchase_order(
      NULL, CURRENT_DATE, 'manager', 'ทดสอบ manager',
      jsonb_build_array(jsonb_build_object('name', 'ของทดสอบ', 'quantity', 1, 'unit', 'กก.', 'price_per_unit', 5))
    )$q$);

  RAISE NOTICE 'PASS  manager · อ่านการเงิน/สต็อก · POS + loyalty + purchase ได้';
END
$$;

DO $$ BEGIN RAISE NOTICE 'PASS M5 role_matrix'; END $$;

ROLLBACK;

\echo ''
\echo '================ M5 role matrix ผ่านครบ ================'
