-- =============================================================
-- M2 Sprint D — upsert_purchase_order · adjust_loyalty_points · price_per_unit
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

-- -------------------------------------------------------------
-- L16 — price_per_unit ถูกบันทึกจาก RPC
-- -------------------------------------------------------------
DO $$
DECLARE
  v_result JSONB;
  v_order_id BIGINT;
  v_ppu    DECIMAL(10, 2);
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner"}', TRUE);

  v_result := public.upsert_purchase_order(
    NULL,
    CURRENT_DATE,
    'ผู้ทดสอบ',
    'ทดสอบ L16',
    jsonb_build_array(
      jsonb_build_object('name', 'แซลมอนทดสอบ', 'quantity', 2.5, 'unit', 'กก.', 'price_per_unit', 120.50)
    )
  );

  v_order_id := (v_result ->> 'order_id')::BIGINT;

  SELECT price_per_unit INTO v_ppu
  FROM item_ingredients
  WHERE purchase_order_id = v_order_id
  LIMIT 1;

  IF v_ppu IS DISTINCT FROM 120.50 THEN
    RAISE EXCEPTION 'L16 ไม่ผ่าน: price_per_unit ควรเป็น 120.50 ได้ %', v_ppu;
  END IF;

  RAISE NOTICE 'PASS  L16 · price_per_unit บันทึกถูกต้อง';
END
$$;

-- -------------------------------------------------------------
-- L6 — แก้ PO ไม่ลบรายการก่อน insert (อัปเดตแถวเดิม + ลบแถวที่ถูกเอาออก)
-- -------------------------------------------------------------
DO $$
DECLARE
  v_result   JSONB;
  v_order_id BIGINT;
  v_item_id  BIGINT;
  v_count    INT;
  v_name     TEXT;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner"}', TRUE);

  v_result := public.upsert_purchase_order(
    NULL,
    CURRENT_DATE,
    'ผู้ทดสอบ',
    NULL,
    jsonb_build_array(
      jsonb_build_object('name', 'รายการ A', 'quantity', 1, 'unit', 'กก.', 'price_per_unit', 100),
      jsonb_build_object('name', 'รายการ B', 'quantity', 2, 'unit', 'กก.', 'price_per_unit', 50)
    )
  );

  v_order_id := (v_result ->> 'order_id')::BIGINT;

  SELECT id INTO v_item_id
  FROM item_ingredients
  WHERE purchase_order_id = v_order_id AND name = 'รายการ A';

  v_result := public.upsert_purchase_order(
    v_order_id,
    CURRENT_DATE,
    'ผู้ทดสอบ',
    'แก้ไข',
    jsonb_build_array(
      jsonb_build_object('id', v_item_id, 'name', 'รายการ A แก้', 'quantity', 3, 'unit', 'กก.', 'price_per_unit', 90),
      jsonb_build_object('name', 'รายการ C', 'quantity', 1, 'unit', 'ถุง', 'price_per_unit', 25)
    )
  );

  SELECT COUNT(*) INTO v_count FROM item_ingredients WHERE purchase_order_id = v_order_id;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'L6 ไม่ผ่าน: ควรเหลือ 2 รายการ (ลบ B เพิ่ม C) ได้ %', v_count;
  END IF;

  SELECT name INTO v_name FROM item_ingredients WHERE id = v_item_id;
  IF v_name <> 'รายการ A แก้' THEN
    RAISE EXCEPTION 'L6 ไม่ผ่าน: แถวเดิมควรถูกอัปเดต ได้ %', v_name;
  END IF;

  RAISE NOTICE 'PASS  L6 · upsert_purchase_order แก้ PO atomic';
END
$$;

-- -------------------------------------------------------------
-- L7 — ปรับแต้ม atomic + clamp ที่ 0
-- -------------------------------------------------------------
DO $$
DECLARE
  v_phone TEXT := '0899999999';
  v_result JSONB;
  v_points INT;
  v_log    INT;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner"}', TRUE);

  INSERT INTO loyalty_members (phone_number, name, points)
  VALUES (v_phone, 'สมาชิกทดสอบ', 10)
  ON CONFLICT (phone_number) DO UPDATE SET points = 10;

  v_result := public.adjust_loyalty_points(v_phone, 5, 'ทดสอบเพิ่มแต้ม');

  IF (v_result ->> 'points')::INT <> 15 THEN
    RAISE EXCEPTION 'L7 ไม่ผ่าน: แต้มควรเป็น 15 ได้ %', v_result;
  END IF;

  v_result := public.adjust_loyalty_points(v_phone, -20, 'ทดสอบหักเกิน');

  IF (v_result ->> 'points')::INT <> 0 THEN
    RAISE EXCEPTION 'L7 ไม่ผ่าน: แต้มควร clamp ที่ 0 ได้ %', v_result;
  END IF;

  SELECT adjustment INTO v_log
  FROM points_logs
  WHERE phone_number = v_phone AND reason = 'ทดสอบหักเกิน'
  ORDER BY id DESC LIMIT 1;

  IF v_log <> -15 THEN
    RAISE EXCEPTION 'L7 ไม่ผ่าน: log ควรบันทึก delta จริง -15 ได้ %', v_log;
  END IF;

  SELECT points INTO v_points FROM loyalty_members WHERE phone_number = v_phone;
  IF v_points <> 0 THEN
    RAISE EXCEPTION 'L7 ไม่ผ่าน: แต้มใน DB ควรเป็น 0';
  END IF;

  RAISE NOTICE 'PASS  L7 · adjust_loyalty_points atomic + clamp';
END
$$;

ROLLBACK;

\echo ''
\echo '================ Sprint D ผ่านครบ ================'
