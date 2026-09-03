-- =============================================================
-- M3 — RLS ราย policy (A1)
--
-- security.sql พิสูจน์ว่า anon แตะอะไรไม่ได้ · a7_audit ตรวจ grant ระดับตาราง
-- ไฟล์นี้สวมสิทธิ์ `authenticated` จริงพร้อม claim ของ staff / owner / คนที่ไม่มี emp_role
-- แล้วไล่ทุกตารางว่าอ่านได้/เขียนได้ตรงกับ policy ที่ประกาศไว้หรือไม่
--
-- ความหมายของผลลัพธ์:
--   rows   = อ่านเห็นข้อมูล (policy ผ่าน)
--   zero   = มีสิทธิ์ระดับตาราง แต่ policy กรองทิ้งหมด (RLS ไม่ error แต่ไม่เห็นข้อมูล)
--   denied = ไม่มี grant ระดับตาราง หรือ WITH CHECK ปฏิเสธ (SQLSTATE 42501)
--   ok     = เขียนสำเร็จจริง
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

CREATE FUNCTION public._rls_read(p_table TEXT) RETURNS TEXT
LANGUAGE plpgsql AS $fn$
DECLARE v_n INT;
BEGIN
  EXECUTE format('SELECT COUNT(*) FROM public.%I', p_table) INTO v_n;
  RETURN CASE WHEN v_n > 0 THEN 'rows' ELSE 'zero' END;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN 'denied';
END;
$fn$;

CREATE FUNCTION public._rls_write(p_sql TEXT) RETURNS TEXT
LANGUAGE plpgsql AS $fn$
DECLARE v_n INT;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN CASE WHEN v_n > 0 THEN 'ok' ELSE 'zero' END;
EXCEPTION
  WHEN insufficient_privilege THEN RETURN 'denied';
  WHEN OTHERS THEN RETURN 'error:' || SQLSTATE;
END;
$fn$;

-- -------------------------------------------------------------
-- 1. บัญชี policy ต้องตรงกับที่ตั้งใจไว้ทุกแถว
--    ใครเพิ่ม/ลบ policy โดยไม่อัปเดตเทสต์ ต้องรู้ตัวที่นี่
-- -------------------------------------------------------------
CREATE TEMP TABLE expected_policies (tablename TEXT, policyname TEXT, cmd TEXT);

INSERT INTO expected_policies VALUES
  ('tables',             'staff_read',   'SELECT'),
  ('orders',             'staff_read',   'SELECT'),
  ('order_items',        'staff_read',   'SELECT'),
  ('order_items',        'staff_serve',  'UPDATE'),
  ('menu_items',         'staff_read',   'SELECT'),
  ('menu_items',         'owner_write',  'ALL'),
  ('promotions',         'staff_read',   'SELECT'),
  ('promotions',         'owner_write',  'ALL'),
  ('qr_sessions',        'staff_read',   'SELECT'),
  ('qr_sessions',        'staff_create', 'INSERT'),
  ('loyalty_members',    'staff_read',   'SELECT'),
  ('loyalty_members',    'staff_create', 'INSERT'),
  ('loyalty_members',    'owner_update', 'UPDATE'),
  ('loyalty_members',    'owner_delete', 'DELETE'),
  ('payments',           'staff_read',   'SELECT'),
  ('payment_promotions', 'staff_read',   'SELECT'),
  ('void_logs',          'staff_read',   'SELECT'),
  ('stock_logs',         'owner_read',   'SELECT'),
  ('points_logs',        'owner_read',   'SELECT'),
  ('points_logs',        'owner_write',  'INSERT'),
  ('item_ingredients',   'owner_read',   'SELECT'),
  ('item_ingredients',   'owner_write',  'ALL'),
  ('purchase_orders',    'owner_read',   'SELECT'),
  ('purchase_orders',    'owner_write',  'ALL');

DO $$
DECLARE
  v_missing TEXT;
  v_extra   TEXT;
  v_roles   TEXT;
  v_norls   TEXT;
BEGIN
  SELECT string_agg(format('%s.%s(%s)', d.tablename, d.policyname, d.cmd), ' ') INTO v_missing
  FROM (
    SELECT * FROM expected_policies
    EXCEPT
    SELECT p.tablename, p.policyname, p.cmd FROM pg_policies p WHERE p.schemaname = 'public'
  ) d;

  SELECT string_agg(format('%s.%s(%s)', d.tablename, d.policyname, d.cmd), ' ') INTO v_extra
  FROM (
    SELECT p.tablename, p.policyname, p.cmd FROM pg_policies p WHERE p.schemaname = 'public'
    EXCEPT
    SELECT * FROM expected_policies
  ) d;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน: policy ที่ควรมีหายไป: %', v_missing;
  END IF;
  IF v_extra IS NOT NULL THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน: มี policy เกินจากที่ตั้งใจ (ต้องรีวิวก่อน): %', v_extra;
  END IF;

  -- ทุก policy ต้องเล็งที่ authenticated เท่านั้น — เผลอเป็น PUBLIC คือเปิดให้ anon กลับมา
  SELECT string_agg(format('%s.%s→%s', p.tablename, p.policyname, p.roles::TEXT), ' ') INTO v_roles
  FROM pg_policies p
  WHERE p.schemaname = 'public' AND p.roles::TEXT <> '{authenticated}';

  IF v_roles IS NOT NULL THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน: policy ที่ไม่ได้เล็ง authenticated: %', v_roles;
  END IF;

  -- ตารางที่ client เข้าถึงได้ต้องเปิด RLS ไว้ทุกตัว
  SELECT string_agg(c.relname, ' ') INTO v_norls
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

  IF v_norls IS NOT NULL THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน: ตารางที่ยังไม่เปิด RLS: %', v_norls;
  END IF;

  RAISE NOTICE 'PASS  A1 · policy 24 แถวตรงตามบัญชี · เล็ง authenticated ทั้งหมด · ทุกตารางเปิด RLS';
END
$$;

-- -------------------------------------------------------------
-- 2. เตรียมข้อมูลอย่างละ 1 แถวในทุกตาราง (ทำในสิทธิ์ postgres)
--    ถ้าตารางว่าง "zero" กับ "rows" จะแยกกันไม่ออก
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu    INT;
  v_order   INT;
  v_item    INT;
  v_promo   INT;
  v_phone   TEXT := '0800000000';
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"ผู้ทดสอบ","emp_role":"owner"}', TRUE);

  SELECT id INTO v_menu FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 500, is_stock_tracked = TRUE WHERE id = v_menu;

  INSERT INTO loyalty_members (phone_number, name, points)
  VALUES (v_phone, 'สมาชิกทดสอบ RLS', 50)
  ON CONFLICT (phone_number) DO UPDATE SET points = 50;

  INSERT INTO promotions (name, type, discount_amount, coupon_code, min_order_amount, is_active)
  VALUES ('คูปองทดสอบ RLS', 'fixed', 10, 'RLSTEST', 0, TRUE)
  RETURNING id INTO v_promo;

  -- โต๊ะ 1: บิลที่ปิดแล้ว → payments + payment_promotions
  UPDATE tables SET status = 'vacant' WHERE id = 1;
  PERFORM public.place_order_item(1, v_menu, 2, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 1 AND o.status = 'active';
  PERFORM public.complete_checkout(v_order, 1000, 'RLSTEST', v_phone, 0);

  -- โต๊ะ 2: บิลที่ยังเปิดอยู่ + รายการที่ถูก void → order_items(pending) + void_logs
  UPDATE tables SET status = 'vacant' WHERE id = 2;
  PERFORM public.place_order_item(2, v_menu, 1, NULL);
  PERFORM public.place_order_item(2, v_menu, 1, 'รายการที่จะ void');
  SELECT oi.id INTO v_item
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.table_id = 2 AND oi.notes = 'รายการที่จะ void';
  PERFORM public.void_order_item(v_item, 'wrong_key', NULL, NULL);

  -- qr_sessions
  INSERT INTO qr_sessions (table_id, status, expired_at)
  VALUES (3, 'active', NOW() + INTERVAL '2 hours');

  -- points_logs
  PERFORM public.adjust_loyalty_points(v_phone, 5, 'ทดสอบ RLS');

  -- purchase_orders + item_ingredients
  PERFORM public.upsert_purchase_order(
    NULL, CURRENT_DATE, 'ผู้ทดสอบ', 'ทดสอบ RLS',
    jsonb_build_array(
      jsonb_build_object('name', 'วัตถุดิบทดสอบ', 'quantity', 1, 'unit', 'กก.', 'price_per_unit', 10)
    )
  );

  -- stock_logs
  INSERT INTO stock_logs (menu_item_id, menu_item_name, employee_name, old_stock, new_stock, change_amount)
  SELECT v_menu, mi.name, 'ผู้ทดสอบ', 500, 505, 5 FROM menu_items mi WHERE mi.id = v_menu;

  RAISE NOTICE 'setup  · มีข้อมูลอย่างละแถวในทุกตารางแล้ว';
END
$$;

-- -------------------------------------------------------------
-- 3. staff — อ่านตารางปฏิบัติการได้ · ตารางหลังร้านต้องมองไม่เห็น
-- -------------------------------------------------------------
DO $$
DECLARE
  v_tbl    TEXT;
  v_expect TEXT;
  v_got    TEXT;
  v_bad    TEXT := '';
  v_i      INT;
  c_tables TEXT[] := ARRAY[
    'tables', 'orders', 'order_items', 'menu_items', 'promotions', 'qr_sessions',
    'loyalty_members', 'payments', 'payment_promotions', 'void_logs',
    'points_logs', 'stock_logs', 'item_ingredients', 'purchase_orders',
    'employees', 'pin_attempts'];
  c_expect TEXT[] := ARRAY[
    'rows', 'rows', 'rows', 'rows', 'rows', 'rows',
    'rows', 'rows', 'rows', 'rows',
    'zero', 'zero', 'zero', 'zero',
    'denied', 'denied'];
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":2,"emp_name":"พนักงาน","emp_role":"staff"}', TRUE);
  SET LOCAL ROLE authenticated;

  FOR v_i IN 1 .. array_length(c_tables, 1) LOOP
    v_tbl := c_tables[v_i];
    v_expect := c_expect[v_i];
    v_got := public._rls_read(v_tbl);
    IF v_got <> v_expect THEN
      v_bad := v_bad || format('%s: ได้ %s ควร %s · ', v_tbl, v_got, v_expect);
    END IF;
  END LOOP;

  RESET ROLE;

  IF v_bad <> '' THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน (staff อ่าน): %', v_bad;
  END IF;

  RAISE NOTICE 'PASS  A1 · staff อ่านตารางปฏิบัติการได้ 10 ตาราง · ตารางหลังร้าน 4 ตารางมองไม่เห็น · employees/pin_attempts ถูกปฏิเสธ';
END
$$;

-- -------------------------------------------------------------
-- 4. staff — เขียนได้แค่ 3 อย่างที่หน้างานต้องใช้
-- -------------------------------------------------------------
DO $$
DECLARE
  v_got TEXT;
  v_bad TEXT := '';
  v_i   INT;
  c_label TEXT[] := ARRAY[
    'ครัวกดเสิร์ฟ (UPDATE order_items)',
    'สร้าง QR ให้ลูกค้า (INSERT qr_sessions)',
    'สมัครสมาชิกตอนเช็คบิล (INSERT loyalty_members)',
    'แก้เมนู (UPDATE menu_items)',
    'เพิ่มโปรโมชั่น (INSERT promotions)',
    'ปรับแต้มสมาชิก (UPDATE loyalty_members)',
    'ลบสมาชิก (DELETE loyalty_members)',
    'เขียน audit แต้ม (INSERT points_logs)',
    'คีย์วัตถุดิบ (INSERT item_ingredients)',
    'แก้สถานะออเดอร์ตรงๆ (UPDATE orders)',
    'แก้สถานะโต๊ะตรงๆ (UPDATE tables)',
    'ลบประวัติการเงิน (DELETE payments)',
    'แทรกรายการอาหารตรงๆ (INSERT order_items)'];
  c_sql TEXT[] := ARRAY[
    $q$UPDATE order_items SET status = 'served' WHERE status = 'pending'$q$,
    $q$INSERT INTO qr_sessions (table_id, status, expired_at) VALUES (4, 'active', NOW() + INTERVAL '1 hour')$q$,
    $q$INSERT INTO loyalty_members (phone_number, name, points) VALUES ('0800000111', 'สมาชิกใหม่', 0)$q$,
    $q$UPDATE menu_items SET stock = 1$q$,
    $q$INSERT INTO promotions (name, type, discount_amount, is_active) VALUES ('โปรที่ staff ไม่ควรเพิ่มได้', 'fixed', 1, TRUE)$q$,
    $q$UPDATE loyalty_members SET points = 9999$q$,
    $q$DELETE FROM loyalty_members WHERE phone_number = '0800000000'$q$,
    $q$INSERT INTO points_logs (phone_number, adjustment, reason, adjusted_by) VALUES ('0800000000', 99, 'ไม่ควรเขียนได้', 'staff')$q$,
    $q$INSERT INTO item_ingredients (name, quantity, unit, cost, purchase_date, buyer_name) VALUES ('ของที่ staff ไม่ควรคีย์', 1, 'กก.', 1, CURRENT_DATE, 'staff')$q$,
    $q$UPDATE orders SET status = 'voided'$q$,
    $q$UPDATE tables SET status = 'vacant'$q$,
    $q$DELETE FROM payments$q$,
    $q$INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) SELECT 1, 1, 1, 0$q$];
  c_expect TEXT[] := ARRAY[
    'ok', 'ok', 'ok',
    'zero', 'denied', 'zero', 'zero', 'denied', 'denied',
    'denied', 'denied', 'denied', 'denied'];
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":2,"emp_name":"พนักงาน","emp_role":"staff"}', TRUE);
  SET LOCAL ROLE authenticated;

  FOR v_i IN 1 .. array_length(c_sql, 1) LOOP
    v_got := public._rls_write(c_sql[v_i]);
    IF v_got <> c_expect[v_i] THEN
      v_bad := v_bad || format('%s: ได้ %s ควร %s · ', c_label[v_i], v_got, c_expect[v_i]);
    END IF;
  END LOOP;

  RESET ROLE;

  IF v_bad <> '' THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน (staff เขียน): %', v_bad;
  END IF;

  RAISE NOTICE 'PASS  A1 · staff เขียนได้แค่ เสิร์ฟ/สร้าง QR/สมัครสมาชิก · งานหลังร้านและตารางการเงินถูกปฏิเสธ';
END
$$;

-- -------------------------------------------------------------
-- 5. owner — เห็นตารางหลังร้าน และเขียนงานหลังร้านได้
--            แต่ยังห้ามแก้ออเดอร์/โต๊ะ/การเงินตรงๆ (ต้องผ่าน RPC)
-- -------------------------------------------------------------
DO $$
DECLARE
  v_got TEXT;
  v_bad TEXT := '';
  v_i   INT;
  c_read TEXT[] := ARRAY['points_logs', 'stock_logs', 'item_ingredients', 'purchase_orders'];
  c_label TEXT[] := ARRAY[
    'แก้เมนู (UPDATE menu_items)',
    'เพิ่มโปรโมชั่น (INSERT promotions)',
    'ปรับแต้มสมาชิก (UPDATE loyalty_members)',
    'เขียน audit แต้ม (INSERT points_logs)',
    'คีย์วัตถุดิบ (INSERT item_ingredients)',
    'แก้ใบจัดซื้อ (UPDATE purchase_orders)',
    'ลบสมาชิก (DELETE loyalty_members)',
    'แก้สถานะออเดอร์ตรงๆ (UPDATE orders)',
    'ลบประวัติการเงิน (DELETE payments)',
    'แทรกรายการอาหารตรงๆ (INSERT order_items)'];
  c_sql TEXT[] := ARRAY[
    $q$UPDATE menu_items SET stock = 123 WHERE is_stock_tracked$q$,
    $q$INSERT INTO promotions (name, type, discount_amount, is_active) VALUES ('โปรที่ owner เพิ่มได้', 'fixed', 1, TRUE)$q$,
    $q$UPDATE loyalty_members SET points = 77 WHERE phone_number = '0800000000'$q$,
    $q$INSERT INTO points_logs (phone_number, adjustment, reason, adjusted_by) VALUES ('0800000000', 1, 'owner ปรับ', 'owner')$q$,
    $q$INSERT INTO item_ingredients (name, quantity, unit, cost, purchase_date, buyer_name) VALUES ('ของที่ owner คีย์ได้', 1, 'กก.', 1, CURRENT_DATE, 'owner')$q$,
    $q$UPDATE purchase_orders SET note = 'owner แก้ได้'$q$,
    $q$DELETE FROM loyalty_members WHERE phone_number = '0800000111'$q$,
    $q$UPDATE orders SET status = 'voided'$q$,
    $q$DELETE FROM payments$q$,
    $q$INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) SELECT 1, 1, 1, 0$q$];
  c_expect TEXT[] := ARRAY[
    'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok',
    'denied', 'denied', 'denied'];
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner"}', TRUE);
  SET LOCAL ROLE authenticated;

  FOREACH v_got IN ARRAY c_read LOOP
    IF public._rls_read(v_got) <> 'rows' THEN
      v_bad := v_bad || format('อ่าน %s ไม่เห็นข้อมูล · ', v_got);
    END IF;
  END LOOP;

  FOR v_i IN 1 .. array_length(c_sql, 1) LOOP
    v_got := public._rls_write(c_sql[v_i]);
    IF v_got <> c_expect[v_i] THEN
      v_bad := v_bad || format('%s: ได้ %s ควร %s · ', c_label[v_i], v_got, c_expect[v_i]);
    END IF;
  END LOOP;

  RESET ROLE;

  IF v_bad <> '' THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน (owner): %', v_bad;
  END IF;

  RAISE NOTICE 'PASS  A1 · owner เห็นตารางหลังร้านและเขียนงานหลังร้านได้ · ยังแก้ออเดอร์/การเงินตรงๆ ไม่ได้';
END
$$;

-- -------------------------------------------------------------
-- 6. JWT ที่ไม่มี emp_role (หรือ role แปลกปลอม) = ไม่ใช่พนักงาน
--    กันกรณีมีคนเซ็น token ด้วย key เดียวกันแต่ไม่ได้ผ่าน /api/auth/login
-- -------------------------------------------------------------
DO $$
DECLARE
  v_tbl   TEXT;
  v_bad   TEXT := '';
  v_claim TEXT;
  c_tables TEXT[] := ARRAY[
    'tables', 'orders', 'order_items', 'menu_items', 'promotions', 'qr_sessions',
    'loyalty_members', 'payments', 'payment_promotions', 'void_logs',
    'points_logs', 'stock_logs', 'item_ingredients', 'purchase_orders'];
BEGIN
  FOREACH v_claim IN ARRAY ARRAY[
    '{"sub":"someone"}',
    '{"emp_id":9,"emp_role":"cook"}',
    '{"emp_id":9,"emp_role":""}'
  ]
  LOOP
    PERFORM set_config('request.jwt.claims', v_claim, TRUE);
    SET LOCAL ROLE authenticated;

    FOREACH v_tbl IN ARRAY c_tables LOOP
      IF public._rls_read(v_tbl) = 'rows' THEN
        v_bad := v_bad || format('claim %s อ่าน %s ได้ · ', v_claim, v_tbl);
      END IF;
    END LOOP;

    IF public._rls_write(
         $q$INSERT INTO qr_sessions (table_id, status, expired_at) VALUES (4, 'active', NOW())$q$
       ) = 'ok' THEN
      v_bad := v_bad || format('claim %s สร้าง QR ได้ · ', v_claim);
    END IF;

    RESET ROLE;
  END LOOP;

  IF v_bad <> '' THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน: %', v_bad;
  END IF;

  RAISE NOTICE 'PASS  A1 · token ที่ไม่มี emp_role หรือ role แปลกปลอม อ่าน/เขียนอะไรไม่ได้เลย';
END
$$;

DROP FUNCTION public._rls_read(TEXT);
DROP FUNCTION public._rls_write(TEXT);

ROLLBACK;

\echo ''
\echo '================ RLS ราย policy ผ่านครบ ================'
