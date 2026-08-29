-- =============================================================
-- ชุดทดสอบ A7.4 / A7.5 / A7.6 / A7.7 + หางของ A1 (สิทธิ์ authenticated)
--
-- รันใน transaction เดียวแล้ว ROLLBACK ทิ้ง → รันซ้ำได้ ไม่ทิ้งขยะ
-- =============================================================

\set ON_ERROR_STOP on
BEGIN;

-- -------------------------------------------------------------
-- A1 (หาง) · authenticated ต้องไม่มีสิทธิ์เกินที่ตั้งใจ
--            โดยเฉพาะ TRUNCATE ซึ่ง RLS ไม่คุม
-- -------------------------------------------------------------
DO $$
DECLARE r RECORD; v_bad TEXT := '';
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    IF has_table_privilege('authenticated', r.relname, 'TRUNCATE') THEN
      v_bad := v_bad || r.relname || ' ';
    END IF;
  END LOOP;

  IF v_bad <> '' THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน: authenticated ยัง TRUNCATE ได้ (RLS ไม่คุม TRUNCATE): %', v_bad;
  END IF;

  IF has_table_privilege('authenticated', 'employees', 'SELECT')
     OR has_table_privilege('authenticated', 'pin_attempts', 'SELECT') THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน: authenticated ยังมีสิทธิ์บน employees / pin_attempts';
  END IF;

  IF has_table_privilege('authenticated', 'payments', 'DELETE')
     OR has_table_privilege('authenticated', 'payments', 'UPDATE')
     OR has_table_privilege('authenticated', 'void_logs', 'INSERT') THEN
    RAISE EXCEPTION 'A1 ไม่ผ่าน: authenticated ยังแก้ตารางการเงิน/audit ได้ตรงๆ';
  END IF;

  RAISE NOTICE 'PASS  A1 · authenticated ไม่มี TRUNCATE ที่ไหนเลย · แตะ employees/pin_attempts ไม่ได้ · payments/void_logs อ่านได้อย่างเดียว';
END
$$;

-- -------------------------------------------------------------
-- A7.7 · ลบโต๊ะต้องไม่ลบประวัติการเงิน
-- -------------------------------------------------------------
DO $$
DECLARE v_menu_id INT; v_order_id INT; v_before INT; v_after INT;
BEGIN
  SELECT id INTO v_menu_id FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu_id;

  PERFORM public.place_order_item(4, v_menu_id, 1, NULL);
  SELECT o.id INTO v_order_id FROM orders o WHERE o.table_id = 4 AND o.status = 'active';
  PERFORM public.complete_checkout(v_order_id, 1000, NULL, NULL, 0);

  SELECT COUNT(*) INTO v_before FROM payments;

  BEGIN
    DELETE FROM tables WHERE id = 4;
    RAISE EXCEPTION 'A7.7 ไม่ผ่าน: ลบโต๊ะที่มีประวัติออเดอร์ได้';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  SELECT COUNT(*) INTO v_after FROM payments;
  IF v_after <> v_before THEN
    RAISE EXCEPTION 'A7.7 ไม่ผ่าน: payments หายไป % แถว', v_before - v_after;
  END IF;

  RAISE NOTICE 'PASS  A7.7 · ลบโต๊ะที่มีประวัติไม่ได้ และ payments ไม่หาย';
END
$$;

-- -------------------------------------------------------------
-- A7.4 · หนึ่งโต๊ะมีบิล active ได้ใบเดียว
-- -------------------------------------------------------------
DO $$
DECLARE v_menu_id INT;
BEGIN
  SELECT id INTO v_menu_id FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu_id;
  PERFORM public.place_order_item(1, v_menu_id, 1, NULL);

  BEGIN
    INSERT INTO orders (table_id, status) VALUES (1, 'active');
    RAISE EXCEPTION 'A7.4 ไม่ผ่าน: เปิดบิล active ซ้ำบนโต๊ะเดิมได้';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS  A7.4 · unique index กันบิล active ซ้ำต่อโต๊ะแล้ว';
  END;
END
$$;

-- -------------------------------------------------------------
-- A7.5 · คืนสต็อกตัดสินด้วยรหัส ไม่ใช่ข้อความไทย
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu_id INT; v_item_id INT; v_before INT; v_after INT; v_log RECORD;
BEGIN
  SELECT id INTO v_menu_id FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu_id;
  PERFORM public.place_order_item(1, v_menu_id, 4, NULL);

  SELECT oi.id INTO v_item_id
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.table_id = 1 AND o.status = 'active' AND oi.status <> 'voided'
  ORDER BY oi.id DESC LIMIT 1;

  -- ข้อความไทยแบบเดิมต้องใช้ไม่ได้แล้ว
  IF public.void_order_item(v_item_id, 'คีย์ผิด', NULL, 1) THEN
    RAISE EXCEPTION 'A7.5 ไม่ผ่าน: ส่งข้อความไทยเป็นรหัสเหตุผลแล้วยังทำงาน';
  END IF;

  -- เลือก "อื่นๆ" ต้องระบุเหตุผล
  IF public.void_order_item(v_item_id, 'other', NULL, 1) THEN
    RAISE EXCEPTION 'A7.5 ไม่ผ่าน: เลือก other โดยไม่ระบุเหตุผลแล้วยังทำงาน';
  END IF;

  -- เหตุผลที่ไม่คืนสต็อก
  SELECT stock INTO v_before FROM menu_items WHERE id = v_menu_id;
  IF NOT public.void_order_item(v_item_id, 'customer_changed', NULL, 1) THEN
    RAISE EXCEPTION 'A7.5 ไม่ผ่าน: void ด้วยรหัสที่ถูกต้องไม่สำเร็จ';
  END IF;
  SELECT stock INTO v_after FROM menu_items WHERE id = v_menu_id;
  IF v_after <> v_before THEN
    RAISE EXCEPTION 'A7.5 ไม่ผ่าน: customer_changed ไม่ควรคืนสต็อก (% → %)', v_before, v_after;
  END IF;

  -- เหตุผลที่คืนสต็อก
  SELECT stock INTO v_before FROM menu_items WHERE id = v_menu_id;
  IF NOT public.void_order_item(v_item_id, 'wrong_key', NULL, 1) THEN
    RAISE EXCEPTION 'A7.5 ไม่ผ่าน: void ด้วย wrong_key ไม่สำเร็จ';
  END IF;
  SELECT stock INTO v_after FROM menu_items WHERE id = v_menu_id;
  IF v_after <> v_before + 1 THEN
    RAISE EXCEPTION 'A7.5 ไม่ผ่าน: wrong_key ต้องคืนสต็อก 1 (% → %)', v_before, v_after;
  END IF;

  SELECT * INTO v_log FROM void_logs ORDER BY id DESC LIMIT 1;
  IF v_log.reason_code <> 'wrong_key' OR NOT v_log.restored_stock THEN
    RAISE EXCEPTION 'A7.5 ไม่ผ่าน: void_logs บันทึก code=% restored=%',
      v_log.reason_code, v_log.restored_stock;
  END IF;
  IF v_log.employee_id IS NOT NULL THEN
    RAISE EXCEPTION 'A7.6 ไม่ผ่าน: ไม่มี JWT แต่กลับมี employee_id = %', v_log.employee_id;
  END IF;

  RAISE NOTICE 'PASS  A7.5 · รหัสเหตุผลตัดสินการคืนสต็อก · ข้อความไทยถูกปฏิเสธ · บันทึก reason_code ลง audit';
END
$$;

-- -------------------------------------------------------------
-- A7.6 · ตัวตนผู้ทำรายการมาจาก JWT ไม่ใช่จาก payload
-- -------------------------------------------------------------
DO $$
DECLARE v_menu_id INT; v_item_id INT; v_log RECORD;
BEGIN
  SELECT id INTO v_menu_id FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu_id;
  PERFORM public.place_order_item(1, v_menu_id, 1, NULL);

  SELECT oi.id INTO v_item_id
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.table_id = 1 AND o.status = 'active' AND oi.status <> 'voided'
  ORDER BY oi.id DESC LIMIT 1;

  -- จำลอง JWT ของพนักงาน id 7
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":7,"emp_name":"พนักงานทดสอบ","emp_role":"staff"}', TRUE);

  PERFORM public.void_order_item(v_item_id, 'cooking_error', 'ทดสอบ', 1);

  SELECT * INTO v_log FROM void_logs ORDER BY id DESC LIMIT 1;
  IF v_log.employee_id IS DISTINCT FROM 7 OR v_log.employee_name <> 'พนักงานทดสอบ' THEN
    RAISE EXCEPTION 'A7.6 ไม่ผ่าน: บันทึกเป็น % / % แทน 7 / พนักงานทดสอบ',
      v_log.employee_id, v_log.employee_name;
  END IF;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  RAISE NOTICE 'PASS  A7.6 · ผู้ทำรายการใน void_logs มาจาก claim ใน JWT';
END
$$;

-- ผู้คีย์ใบสั่งซื้อวัตถุดิบถูกประทับจาก JWT แม้ client จะส่งค่าอื่นมา
DO $$
DECLARE v_po RECORD;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":9,"emp_name":"เจ้าของร้าน","emp_role":"owner"}', TRUE);

  INSERT INTO purchase_orders (buyer_name, total_cost, created_by_emp_id, created_by_name)
  VALUES ('ลุงแดง (คนไปตลาด)', 500, 999, 'ชื่อปลอมที่ client ส่งมา');

  SELECT * INTO v_po FROM purchase_orders ORDER BY id DESC LIMIT 1;

  IF v_po.created_by_emp_id IS DISTINCT FROM 9 OR v_po.created_by_name <> 'เจ้าของร้าน' THEN
    RAISE EXCEPTION 'A7.6 ไม่ผ่าน: purchase_orders ยังเชื่อค่าที่ client ส่งมา (% / %)',
      v_po.created_by_emp_id, v_po.created_by_name;
  END IF;
  IF v_po.buyer_name <> 'ลุงแดง (คนไปตลาด)' THEN
    RAISE EXCEPTION 'A7.6 ไม่ผ่าน: buyer_name ซึ่งเป็นข้อมูลธุรกิจไม่ควรถูกเขียนทับ';
  END IF;

  PERFORM set_config('request.jwt.claims', '', TRUE);
  RAISE NOTICE 'PASS  A7.6 · purchase_orders ประทับผู้คีย์จาก JWT (buyer_name ยังแก้ได้ตามจริง)';
END
$$;

ROLLBACK;

\echo ''
\echo '================ A7 ผ่านครบทุกข้อ ================'
