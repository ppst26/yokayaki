-- =============================================================
-- ชุดทดสอบความปลอดภัย A2–A6 + สิทธิ์ของ anon
--
--   pnpm db:test
--
-- ทั้งไฟล์รันใน transaction เดียวแล้ว ROLLBACK ทิ้งตอนจบ → รันซ้ำได้ไม่จำกัด
-- ข้อไหนไม่ผ่าน = RAISE EXCEPTION → psql คืน exit code ไม่ใช่ 0 → CI จับได้
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

-- -------------------------------------------------------------
-- A1 · สิทธิ์ของ anon ต้องไม่เหลืออะไรเลย
-- -------------------------------------------------------------
DO $$
DECLARE r RECORD; v_leak TEXT := '';
BEGIN
  FOR r IN
    SELECT c.relname,
           has_table_privilege('anon', c.oid, 'SELECT') AS can_select,
           has_table_privilege('anon', c.oid, 'INSERT') AS can_insert,
           has_table_privilege('anon', c.oid, 'UPDATE') AS can_update,
           has_table_privilege('anon', c.oid, 'DELETE') AS can_delete
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    IF r.can_select OR r.can_insert OR r.can_update OR r.can_delete THEN
      v_leak := v_leak || r.relname || ' ';
    END IF;
  END LOOP;

  IF v_leak <> '' THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน: anon ยังมีสิทธิ์บนตาราง: %', v_leak;
  END IF;

  -- หมายเหตุ: ไม่ได้เช็ค USAGE บน schema public เพราะ 20260824 ตั้งใจคืนให้ anon
  -- (ไม่งั้น PostgREST คืน error แปลกๆ แทน 401/permission denied)
  -- และถึงจะ revoke จาก anon ก็ยังติด grant ที่ PostgreSQL ให้ PUBLIC มาแต่เดิมอยู่ดี
  -- USAGE เปล่าๆ ไม่ให้สิทธิ์อะไรเลยถ้าไม่มีสิทธิ์บน object — ตัวที่ต้องปิดคือ 2 บล็อกนี้
  RAISE NOTICE 'PASS  A1 · anon ไม่มีสิทธิ์อ่าน/เขียนตารางใดเลยทั้ง % ตาราง',
    (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r');
END
$$;

-- พิสูจน์ด้วยการสวมสิทธิ์ anon จริงๆ ไม่ใช่แค่ดู catalog
DO $$
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM 1 FROM employees LIMIT 1;
    RESET ROLE;
    RAISE EXCEPTION 'A1 ไม่ผ่าน: anon ยัง SELECT ตาราง employees ได้จริง';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS  A1 · สวมสิทธิ์ anon แล้วอ่าน employees ไม่ได้จริง';
  END;
  RESET ROLE;
END
$$;

DO $$
DECLARE r RECORD; v_leak TEXT := '';
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    IF has_function_privilege('anon', r.sig, 'EXECUTE') THEN
      v_leak := v_leak || r.sig || ' ';
    END IF;
  END LOOP;

  IF v_leak <> '' THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน: anon ยังเรียก RPC ได้: %', v_leak;
  END IF;
  RAISE NOTICE 'PASS  A1 · anon เรียก RPC ไม่ได้สักตัว';
END
$$;

-- -------------------------------------------------------------
-- A2 · PIN
-- -------------------------------------------------------------
DO $$
DECLARE v_id INT; v_row RECORD; v_locked INT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'employees'
               AND column_name = 'pin_hash') THEN
    RAISE EXCEPTION 'A2 ไม่ผ่าน: คอลัมน์ employees.pin_hash ยังอยู่';
  END IF;

  v_id := public.admin_add_employee('ทดสอบ A2', '654321', 'staff');
  IF v_id IS NULL OR v_id < 0 THEN
    RAISE EXCEPTION 'A2 ไม่ผ่าน: สร้างพนักงานทดสอบไม่สำเร็จ (%)', v_id;
  END IF;

  -- PIN ถูก → ได้ตัวตนกลับมา
  SELECT * INTO v_row FROM public.verify_pin('654321', 'test-key-ok');
  IF v_row.emp_id IS DISTINCT FROM v_id THEN
    RAISE EXCEPTION 'A2 ไม่ผ่าน: PIN ที่ถูกต้องกลับล็อกอินไม่ได้';
  END IF;

  -- PIN ผิดซ้ำๆ จากคีย์เดียวกัน → ต้องโดนล็อก
  FOR i IN 1..5 LOOP
    SELECT * INTO v_row FROM public.verify_pin('000001', 'test-key-brute');
    v_locked := GREATEST(v_locked, COALESCE(v_row.locked_seconds, 0));
  END LOOP;

  IF v_locked <= 0 THEN
    RAISE EXCEPTION 'A2 ไม่ผ่าน: เดา PIN ผิด 5 ครั้งแล้วยังไม่ถูกล็อก';
  END IF;

  RAISE NOTICE 'PASS  A2 · pin_hash หายไปแล้ว · bcrypt ใช้ได้ · ผิด 5 ครั้งถูกล็อก % วินาที', v_locked;
END
$$;

-- เพดานรวมทั้งระบบ: สลับคีย์ไปเรื่อยๆ ก็ต้องโดนล็อกอยู่ดี
DO $$
DECLARE v_row RECORD; v_locked INT := 0;
BEGIN
  DELETE FROM pin_attempts;
  FOR i IN 1..25 LOOP
    SELECT * INTO v_row FROM public.verify_pin('000002', 'rotating-key-' || i);
    v_locked := GREATEST(v_locked, COALESCE(v_row.locked_seconds, 0));
  END LOOP;

  IF v_locked <= 0 THEN
    RAISE EXCEPTION 'A2 ไม่ผ่าน: สลับ client key หนี lockout ได้ (เพดานรวมไม่ทำงาน)';
  END IF;
  RAISE NOTICE 'PASS  A2 · สลับ client key แล้วยังโดนเพดานรวมทั้งระบบ (% วินาที)', v_locked;
END
$$;

-- -------------------------------------------------------------
-- A3 · RPC จัดการพนักงานตัวเก่าต้องไม่มีอยู่แล้ว
-- -------------------------------------------------------------
DO $$
DECLARE v_left TEXT;
BEGIN
  SELECT string_agg(p.proname, ', ') INTO v_left
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('add_employee', 'update_employee', 'delete_employee');

  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION 'A3 ไม่ผ่าน: RPC เดิมยังอยู่: %', v_left;
  END IF;
  RAISE NOTICE 'PASS  A3 · add_employee / update_employee / delete_employee ถูก DROP แล้ว';
END
$$;

-- -------------------------------------------------------------
-- A4 · ราคาต้องมาจาก menu_items ไม่ใช่จากผู้เรียก
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu_id INT; v_price DECIMAL(10,2); v_saved DECIMAL(10,2); v_ok BOOLEAN;
BEGIN
  -- ต้องไม่มี overload ที่รับราคาหลงเหลือ
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('place_order_item', 'customer_place_order_item')
      AND pg_get_function_identity_arguments(p.oid) LIKE '%numeric%'
  ) THEN
    RAISE EXCEPTION 'A4 ไม่ผ่าน: ยังมี overload ที่รับ p_unit_price อยู่';
  END IF;

  SELECT id, price INTO v_menu_id, v_price FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu_id;

  v_ok := public.place_order_item(1, v_menu_id, 2, NULL);
  IF NOT v_ok THEN RAISE EXCEPTION 'A4 ไม่ผ่าน: สั่งอาหารไม่สำเร็จ'; END IF;

  SELECT oi.unit_price INTO v_saved
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.table_id = 1 AND o.status = 'active'
  ORDER BY oi.id DESC LIMIT 1;

  IF v_saved IS DISTINCT FROM v_price THEN
    RAISE EXCEPTION 'A4 ไม่ผ่าน: ราคาที่บันทึก (%) ไม่ตรงกับราคาในเมนู (%)', v_saved, v_price;
  END IF;

  -- จำนวนติดลบ/ศูนย์ต้องถูกปฏิเสธ
  IF public.place_order_item(1, v_menu_id, 0, NULL) THEN
    RAISE EXCEPTION 'A4 ไม่ผ่าน: สั่งจำนวน 0 ได้';
  END IF;
  IF public.place_order_item(1, v_menu_id, -5, NULL) THEN
    RAISE EXCEPTION 'A4 ไม่ผ่าน: สั่งจำนวนติดลบได้';
  END IF;

  RAISE NOTICE 'PASS  A4 · ราคาที่บันทึกมาจาก menu_items (%) และกันจำนวน <= 0 แล้ว', v_price;
END
$$;

-- -------------------------------------------------------------
-- A5 · ยอดบิลคำนวณใน DB
-- -------------------------------------------------------------
DO $$
DECLARE
  v_order_id INT; v_expected DECIMAL(10,2); v_res RECORD;
BEGIN
  SELECT o.id INTO v_order_id FROM orders o WHERE o.table_id = 1 AND o.status = 'active';
  SELECT SUM(oi.quantity * oi.unit_price) INTO v_expected
  FROM order_items oi WHERE oi.order_id = v_order_id AND oi.status <> 'voided';

  SELECT * INTO v_res FROM public.complete_checkout(v_order_id, v_expected, NULL, NULL, 0);

  IF v_res.status <> 'ok' THEN
    RAISE EXCEPTION 'A5 ไม่ผ่าน: ปิดบิลไม่สำเร็จ (%)', v_res.status;
  END IF;
  IF v_res.subtotal IS DISTINCT FROM v_expected OR v_res.net_amount IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'A5 ไม่ผ่าน: DB คิดยอดได้ % / % แต่ของจริงคือ %',
      v_res.subtotal, v_res.net_amount, v_expected;
  END IF;
  IF (SELECT net_amount FROM payments WHERE order_id = v_order_id) IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'A5 ไม่ผ่าน: ยอดใน payments ไม่ตรงกับที่คำนวณ';
  END IF;

  RAISE NOTICE 'PASS  A5 · ยอดบิล % คำนวณจาก order_items ใน DB', v_expected;
END
$$;

-- แต้ม: ขอใช้เกินที่มี ต้องถูก clamp และห้ามติดลบ
DO $$
DECLARE
  v_menu_id INT; v_order_id INT; v_res RECORD; v_points INT;
BEGIN
  INSERT INTO loyalty_members (phone_number, name, points)
  VALUES ('0812345678', 'ทดสอบ A5', 5)
  ON CONFLICT (phone_number) DO UPDATE SET points = 5;

  SELECT id INTO v_menu_id FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu_id;
  PERFORM public.place_order_item(2, v_menu_id, 3, NULL);
  SELECT o.id INTO v_order_id FROM orders o WHERE o.table_id = 2 AND o.status = 'active';

  -- ขอใช้ 99999 แต้ม ทั้งที่มี 5
  SELECT * INTO v_res FROM public.complete_checkout(v_order_id, 0, NULL, '0812345678', 99999);

  IF v_res.points_redeemed > 5 THEN
    RAISE EXCEPTION 'A5 ไม่ผ่าน: ใช้แต้มได้ % ทั้งที่มีแค่ 5', v_res.points_redeemed;
  END IF;

  SELECT points INTO v_points FROM loyalty_members WHERE phone_number = '0812345678';
  IF v_points < 0 THEN
    RAISE EXCEPTION 'A5 ไม่ผ่าน: แต้มสมาชิกติดลบ (%)', v_points;
  END IF;

  -- แต้มที่ได้ต้องเป็น net / 10 พอดี
  IF v_res.points_earned IS DISTINCT FROM FLOOR(v_res.net_amount / 10)::INT THEN
    RAISE EXCEPTION 'A5 ไม่ผ่าน: แต้มที่ได้ % ไม่ตรงกับ net(%)/10',
      v_res.points_earned, v_res.net_amount;
  END IF;

  RAISE NOTICE 'PASS  A5 · ใช้แต้มถูก clamp เหลือ % · แต้มคงเหลือ % · ได้แต้มใหม่ % (net %)',
    v_res.points_redeemed, v_points, v_res.points_earned, v_res.net_amount;
END
$$;

-- โปรโมชั่นที่หมดอายุ / ปิดอยู่ / ยอดไม่ถึงขั้นต่ำ ต้องไม่ถูกใช้
DO $$
DECLARE
  v_menu_id INT; v_order_id INT; v_res RECORD;
BEGIN
  INSERT INTO promotions (name, type, discount_percent, min_order_amount, is_active, end_date)
  VALUES ('โปรหมดอายุ (ทดสอบ)', 'percentage', 50, 0, TRUE, CURRENT_DATE - 1);
  INSERT INTO promotions (name, type, discount_percent, min_order_amount, is_active)
  VALUES ('โปรปิดอยู่ (ทดสอบ)', 'percentage', 50, 0, FALSE);
  INSERT INTO promotions (name, type, discount_amount, min_order_amount, is_active)
  VALUES ('โปรยอดขั้นต่ำสูง (ทดสอบ)', 'fixed', 100, 999999, TRUE);

  SELECT id INTO v_menu_id FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu_id;
  PERFORM public.place_order_item(3, v_menu_id, 1, NULL);
  SELECT o.id INTO v_order_id FROM orders o WHERE o.table_id = 3 AND o.status = 'active';

  SELECT * INTO v_res FROM public.complete_checkout(v_order_id, 0, NULL, NULL, 0);

  IF v_res.promo_discount <> 0 THEN
    RAISE EXCEPTION 'A5 ไม่ผ่าน: โปรที่ไม่มีสิทธิ์ถูกนำมาใช้ (ส่วนลด %)', v_res.promo_discount;
  END IF;
  IF jsonb_array_length(v_res.applied_promos) <> 0 THEN
    RAISE EXCEPTION 'A5 ไม่ผ่าน: มีโปรถูกบันทึกทั้งที่ไม่เข้าเงื่อนไข: %', v_res.applied_promos;
  END IF;

  RAISE NOTICE 'PASS  A5 · โปรหมดอายุ / ปิดอยู่ / ยอดไม่ถึงขั้นต่ำ ไม่ถูกนำมาใช้';
END
$$;

-- -------------------------------------------------------------
-- A6 · ปิดบิลซ้ำไม่ได้
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu_id INT; v_order_id INT; v_first RECORD; v_second RECORD; v_count INT;
BEGIN
  SELECT id INTO v_menu_id FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu_id;
  PERFORM public.place_order_item(4, v_menu_id, 2, NULL);
  SELECT o.id INTO v_order_id FROM orders o WHERE o.table_id = 4 AND o.status = 'active';

  SELECT * INTO v_first  FROM public.complete_checkout(v_order_id, 1000, NULL, NULL, 0);
  SELECT * INTO v_second FROM public.complete_checkout(v_order_id, 1000, NULL, NULL, 0);

  IF v_first.status <> 'ok' THEN
    RAISE EXCEPTION 'A6 ไม่ผ่าน: ปิดบิลครั้งแรกไม่สำเร็จ (%)', v_first.status;
  END IF;
  IF v_second.status <> 'already_completed' THEN
    RAISE EXCEPTION 'A6 ไม่ผ่าน: ปิดบิลรอบสองได้สถานะ % (ควรเป็น already_completed)', v_second.status;
  END IF;

  SELECT COUNT(*) INTO v_count FROM payments WHERE order_id = v_order_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'A6 ไม่ผ่าน: order นี้มี payments % แถว', v_count;
  END IF;

  RAISE NOTICE 'PASS  A6 · ปิดบิลรอบสองคืนใบเดิม และ payments มีแถวเดียว';
END
$$;

-- unique index ต้องกันการเขียนซ้ำระดับตารางด้วย ไม่ใช่พึ่งโค้ดในฟังก์ชันอย่างเดียว
DO $$
DECLARE v_order_id INT;
BEGIN
  SELECT order_id INTO v_order_id FROM payments WHERE order_id IS NOT NULL LIMIT 1;
  BEGIN
    INSERT INTO payments (order_id, payment_method, subtotal, discount_amount, net_amount)
    VALUES (v_order_id, 'cash', 1, 0, 1);
    RAISE EXCEPTION 'A6 ไม่ผ่าน: เขียน payments ซ้ำ order เดิมได้';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS  A6 · UNIQUE(payments.order_id) กันการเขียนซ้ำที่ระดับตาราง';
  END;
END
$$;

-- แต้มติดลบต้องถูกฐานข้อมูลปฏิเสธ
DO $$
BEGIN
  BEGIN
    UPDATE loyalty_members SET points = -1 WHERE phone_number = '0812345678';
    RAISE EXCEPTION 'A5 ไม่ผ่าน: ตั้งแต้มเป็นค่าติดลบได้';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS  A5 · CHECK (points >= 0) ปฏิเสธแต้มติดลบ';
  END;
END
$$;

ROLLBACK;

\echo ''
\echo '================ ผ่านครบทุกข้อ ================'
