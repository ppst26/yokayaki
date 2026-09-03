-- =============================================================
-- M3 — complete_checkout เชิงลึก
--
-- security.sql ครอบไว้แล้วว่ายอดมาจาก order_items (A5) · แต้ม clamp · ปิดซ้ำไม่ได้ (A6)
-- ไฟล์นี้ไล่ส่วนที่เหลือของฟังก์ชัน: คูปอง · โปรแต่ละชนิด · การแบ่งยอดชำระ ·
-- ผลข้างเคียงตอนปิดบิล (โต๊ะ · QR · order_items) · ออเดอร์ที่ไม่มีจริง
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

-- โปรที่ค้างอยู่ในฐานจะติดมากับบิลทดสอบด้วย — แต่ละเทสต์ปิดทั้งหมดก่อนแล้วเปิดเฉพาะตัวของตัวเอง
CREATE FUNCTION pg_temp.only_promo(p_promo_id INT) RETURNS VOID
LANGUAGE sql AS $fn$
  UPDATE promotions SET is_active = (id = p_promo_id);
$fn$;

-- คืนโต๊ะให้ว่างและล้างบิลเก่าของโต๊ะนั้น (payments ถูก FK RESTRICT จึงต้องลบก่อน order)
CREATE FUNCTION pg_temp.reset_table(p_table_id INT) RETURNS VOID
LANGUAGE plpgsql AS $fn$
BEGIN
  DELETE FROM payments    WHERE order_id IN (SELECT id FROM orders WHERE table_id = p_table_id);
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE table_id = p_table_id);
  DELETE FROM orders      WHERE table_id = p_table_id;
  UPDATE tables SET status = 'vacant' WHERE id = p_table_id;
END;
$fn$;

-- เมนูราคาคงที่ ไม่ติด Happy Hour → ยอดที่คาดหวังคำนวณด้วยมือได้
CREATE FUNCTION pg_temp.fixed_price_menu(p_offset INT, p_price DECIMAL) RETURNS INT
LANGUAGE plpgsql AS $fn$
DECLARE v_id INT;
BEGIN
  SELECT id INTO v_id FROM menu_items ORDER BY id OFFSET p_offset LIMIT 1;
  UPDATE menu_items
  SET price = p_price, is_happy_hour = FALSE, happy_hour_price = NULL,
      stock = 500, is_stock_tracked = TRUE
  WHERE id = v_id;
  RETURN v_id;
END;
$fn$;

-- -------------------------------------------------------------
-- คูปอง — ใช้ได้เฉพาะเมื่อกรอกรหัสตรงกัน
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu  INT;
  v_promo INT;
  v_order INT;
  v_res   RECORD;
  v_saved DECIMAL(10, 2);
BEGIN
  v_menu := pg_temp.fixed_price_menu(0, 100);

  INSERT INTO promotions (name, type, discount_amount, coupon_code, min_order_amount, is_active)
  VALUES ('คูปองทดสอบ 50', 'fixed', 50, 'E2ETEST50', 0, TRUE)
  RETURNING id INTO v_promo;
  PERFORM pg_temp.only_promo(v_promo);

  -- ไม่กรอกคูปอง → ไม่ได้ส่วนลด
  PERFORM pg_temp.reset_table(1);
  PERFORM public.place_order_item(1, v_menu, 1, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 1 AND o.status = 'active';
  SELECT * INTO v_res FROM public.complete_checkout(v_order, 100, NULL, NULL, 0);

  IF v_res.promo_discount <> 0 OR v_res.net_amount <> 100 THEN
    RAISE EXCEPTION 'คูปองไม่ผ่าน: ไม่กรอกรหัสแต่ได้ส่วนลด % (net %)',
      v_res.promo_discount, v_res.net_amount;
  END IF;

  -- กรอกรหัสผิด → ไม่ได้ส่วนลด
  PERFORM pg_temp.reset_table(2);
  PERFORM public.place_order_item(2, v_menu, 1, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 2 AND o.status = 'active';
  SELECT * INTO v_res FROM public.complete_checkout(v_order, 100, 'NOPE', NULL, 0);

  IF v_res.promo_discount <> 0 THEN
    RAISE EXCEPTION 'คูปองไม่ผ่าน: รหัสผิดแต่ได้ส่วนลด %', v_res.promo_discount;
  END IF;

  -- กรอกถูก (พิมพ์เล็ก + มีช่องว่าง) → ได้ส่วนลด และถูกบันทึกใน payment_promotions
  PERFORM pg_temp.reset_table(3);
  PERFORM public.place_order_item(3, v_menu, 1, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 3 AND o.status = 'active';
  SELECT * INTO v_res FROM public.complete_checkout(v_order, 100, '  e2etest50 ', NULL, 0);

  IF v_res.promo_discount <> 50 OR v_res.net_amount <> 50 THEN
    RAISE EXCEPTION 'คูปองไม่ผ่าน: ควรลด 50 เหลือ 50 ได้ส่วนลด % net %',
      v_res.promo_discount, v_res.net_amount;
  END IF;

  SELECT pp.discount_value INTO v_saved
  FROM payment_promotions pp WHERE pp.payment_id = v_res.payment_id AND pp.promotion_id = v_promo;

  IF v_saved IS DISTINCT FROM 50 THEN
    RAISE EXCEPTION 'คูปองไม่ผ่าน: payment_promotions ไม่ได้บันทึกส่วนลด (ได้ %)', v_saved;
  END IF;

  RAISE NOTICE 'PASS  checkout · คูปองใช้ได้เฉพาะรหัสที่ตรงกัน และถูกบันทึกลง payment_promotions';
END
$$;

-- -------------------------------------------------------------
-- ส่วนลดรวมห้ามเกินยอดบิล (LEAST) — ยอดสุทธิห้ามติดลบ
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu INT; v_promo INT; v_order INT; v_res RECORD;
BEGIN
  v_menu := pg_temp.fixed_price_menu(0, 100);

  INSERT INTO promotions (name, type, discount_amount, min_order_amount, is_active)
  VALUES ('ลดเกินยอดบิล (ทดสอบ)', 'fixed', 999, 0, TRUE)
  RETURNING id INTO v_promo;
  PERFORM pg_temp.only_promo(v_promo);

  PERFORM pg_temp.reset_table(1);
  PERFORM public.place_order_item(1, v_menu, 1, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 1 AND o.status = 'active';
  SELECT * INTO v_res FROM public.complete_checkout(v_order, 0, NULL, NULL, 0);

  IF v_res.promo_discount <> 100 OR v_res.net_amount <> 0 THEN
    RAISE EXCEPTION 'ไม่ผ่าน: ส่วนลด % / net % (ควรเป็น 100 / 0)',
      v_res.promo_discount, v_res.net_amount;
  END IF;

  RAISE NOTICE 'PASS  checkout · ส่วนลดถูก clamp ไม่เกินยอดบิล';
END
$$;

-- -------------------------------------------------------------
-- buy_x_get_y — คิดของแถมเป็นชุดตามจำนวนที่สั่งจริง
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu INT; v_promo INT; v_order INT; v_res RECORD; v_free JSONB;
BEGIN
  v_menu := pg_temp.fixed_price_menu(0, 100);

  INSERT INTO promotions (name, type, buy_qty, free_qty, menu_item_id, min_order_amount, is_active)
  VALUES ('ซื้อ 2 แถม 1 (ทดสอบ)', 'buy_x_get_y', 2, 1, v_menu, 0, TRUE)
  RETURNING id INTO v_promo;
  PERFORM pg_temp.only_promo(v_promo);

  -- สั่ง 3 ชิ้น = 1 ชุด (2+1) → แถม 1 ชิ้น = ลด 100
  PERFORM pg_temp.reset_table(1);
  PERFORM public.place_order_item(1, v_menu, 3, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 1 AND o.status = 'active';
  SELECT * INTO v_res FROM public.complete_checkout(v_order, 0, NULL, NULL, 0);

  IF v_res.subtotal <> 300 OR v_res.promo_discount <> 100 OR v_res.net_amount <> 200 THEN
    RAISE EXCEPTION 'buy_x_get_y ไม่ผ่าน: subtotal % ส่วนลด % net % (ควร 300 / 100 / 200)',
      v_res.subtotal, v_res.promo_discount, v_res.net_amount;
  END IF;

  SELECT pp.free_items INTO v_free
  FROM payment_promotions pp WHERE pp.payment_id = v_res.payment_id;

  IF v_free IS NULL OR jsonb_array_length(v_free) <> 1
     OR (v_free -> 0 ->> 'qty')::INT <> 1 THEN
    RAISE EXCEPTION 'buy_x_get_y ไม่ผ่าน: รายการของแถมที่บันทึกไว้ผิด (%)', v_free;
  END IF;

  -- สั่ง 2 ชิ้น = ยังไม่ครบชุด → ไม่มีของแถม
  PERFORM pg_temp.reset_table(2);
  PERFORM public.place_order_item(2, v_menu, 2, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 2 AND o.status = 'active';
  SELECT * INTO v_res FROM public.complete_checkout(v_order, 0, NULL, NULL, 0);

  IF v_res.promo_discount <> 0 THEN
    RAISE EXCEPTION 'buy_x_get_y ไม่ผ่าน: สั่ง 2 ชิ้นยังไม่ครบชุดแต่ได้ส่วนลด %', v_res.promo_discount;
  END IF;

  RAISE NOTICE 'PASS  checkout · buy_x_get_y คิดของแถมเป็นชุด และบันทึกรายการของแถม';
END
$$;

-- -------------------------------------------------------------
-- percentage ที่ผูกกับเมนู — ต้องลดเฉพาะรายการของเมนูนั้น
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu_a INT; v_menu_b INT; v_promo INT; v_order INT; v_res RECORD;
BEGIN
  v_menu_a := pg_temp.fixed_price_menu(0, 100);
  v_menu_b := pg_temp.fixed_price_menu(1, 200);

  INSERT INTO promotions (name, type, discount_percent, menu_item_id, min_order_amount, is_active)
  VALUES ('ลด 50% เฉพาะเมนู A (ทดสอบ)', 'percentage', 50, v_menu_a, 0, TRUE)
  RETURNING id INTO v_promo;
  PERFORM pg_temp.only_promo(v_promo);

  PERFORM pg_temp.reset_table(1);
  PERFORM public.place_order_item(1, v_menu_a, 1, NULL);
  PERFORM public.place_order_item(1, v_menu_b, 1, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 1 AND o.status = 'active';
  SELECT * INTO v_res FROM public.complete_checkout(v_order, 0, NULL, NULL, 0);

  -- 50% ของเมนู A (100) = 50 · เมนู B (200) ไม่ถูกลด
  IF v_res.subtotal <> 300 OR v_res.promo_discount <> 50 OR v_res.net_amount <> 250 THEN
    RAISE EXCEPTION 'percentage ไม่ผ่าน: subtotal % ส่วนลด % net % (ควร 300 / 50 / 250)',
      v_res.subtotal, v_res.promo_discount, v_res.net_amount;
  END IF;

  RAISE NOTICE 'PASS  checkout · percentage ที่ผูกเมนูลดเฉพาะรายการของเมนูนั้น';
END
$$;

-- -------------------------------------------------------------
-- การแบ่งยอดชำระ — เงินสดที่เกินคือเงินทอน ไม่ใช่ยอดขาย
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu INT; v_order INT; v_res RECORD;
BEGIN
  v_menu := pg_temp.fixed_price_menu(0, 100);
  UPDATE promotions SET is_active = FALSE;

  -- จ่ายสดเกินยอด → cash เท่ายอดบิล · ที่เหลือเป็นเงินทอน
  PERFORM pg_temp.reset_table(1);
  PERFORM public.place_order_item(1, v_menu, 1, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 1 AND o.status = 'active';
  SELECT * INTO v_res FROM public.complete_checkout(v_order, 500, NULL, NULL, 0);

  IF v_res.payment_method <> 'cash' OR v_res.cash_amount <> 100
     OR v_res.promptpay_amount <> 0 OR v_res.change_amount <> 400 THEN
    RAISE EXCEPTION 'แบ่งยอดไม่ผ่าน (สด): method % cash % promptpay % change %',
      v_res.payment_method, v_res.cash_amount, v_res.promptpay_amount, v_res.change_amount;
  END IF;

  IF (SELECT cash_amount FROM payments WHERE order_id = v_order) <> 100 THEN
    RAISE EXCEPTION 'แบ่งยอดไม่ผ่าน: payments.cash_amount รวมเงินทอนเข้าไปด้วย';
  END IF;

  -- ไม่จ่ายสดเลย → เป็นการโอนทั้งจำนวน
  PERFORM pg_temp.reset_table(2);
  PERFORM public.place_order_item(2, v_menu, 1, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 2 AND o.status = 'active';
  SELECT * INTO v_res FROM public.complete_checkout(v_order, 0, NULL, NULL, 0);

  IF v_res.payment_method <> 'promptpay' OR v_res.promptpay_amount <> 100 THEN
    RAISE EXCEPTION 'แบ่งยอดไม่ผ่าน (โอน): method % promptpay %',
      v_res.payment_method, v_res.promptpay_amount;
  END IF;

  -- จ่ายสดบางส่วน → ที่เหลือเป็นยอดโอน
  PERFORM pg_temp.reset_table(3);
  PERFORM public.place_order_item(3, v_menu, 1, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 3 AND o.status = 'active';
  SELECT * INTO v_res FROM public.complete_checkout(v_order, 40, NULL, NULL, 0);

  IF v_res.payment_method <> 'mixed' OR v_res.cash_amount <> 40
     OR v_res.promptpay_amount <> 60 OR v_res.change_amount <> 0 THEN
    RAISE EXCEPTION 'แบ่งยอดไม่ผ่าน (ผสม): method % cash % promptpay % change %',
      v_res.payment_method, v_res.cash_amount, v_res.promptpay_amount, v_res.change_amount;
  END IF;

  RAISE NOTICE 'PASS  checkout · แยกยอด สด/โอน/ผสม และเงินทอนไม่ถูกนับเป็นยอดขาย';
END
$$;

-- -------------------------------------------------------------
-- รายการที่ถูก void ไม่เข้ายอดบิล · ปิดบิลแล้วต้องเคลียร์โต๊ะ + QR + รายการค้างครัว
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu_a INT; v_menu_b INT; v_order INT; v_item_b INT; v_session UUID; v_res RECORD;
  v_table_status TEXT; v_session_status TEXT; v_pending INT; v_order_status TEXT;
BEGIN
  v_menu_a := pg_temp.fixed_price_menu(0, 100);
  v_menu_b := pg_temp.fixed_price_menu(1, 200);
  UPDATE promotions SET is_active = FALSE;

  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"ผู้ทดสอบ","emp_role":"owner"}', TRUE);

  PERFORM pg_temp.reset_table(4);
  PERFORM public.place_order_item(4, v_menu_a, 1, NULL);
  PERFORM public.place_order_item(4, v_menu_b, 1, NULL);
  SELECT o.id INTO v_order FROM orders o WHERE o.table_id = 4 AND o.status = 'active';

  SELECT oi.id INTO v_item_b
  FROM order_items oi WHERE oi.order_id = v_order AND oi.menu_item_id = v_menu_b;

  IF NOT public.void_order_item(v_item_b, 'customer_changed', NULL, NULL) THEN
    RAISE EXCEPTION 'ไม่ผ่าน: void รายการเตรียมทดสอบไม่สำเร็จ';
  END IF;

  INSERT INTO qr_sessions (table_id, status, expired_at)
  VALUES (4, 'active', NOW() + INTERVAL '2 hours')
  RETURNING id INTO v_session;

  SELECT * INTO v_res FROM public.complete_checkout(v_order, 100, NULL, NULL, 0);

  IF v_res.subtotal <> 100 THEN
    RAISE EXCEPTION 'ไม่ผ่าน: รายการที่ void ยังถูกนับในยอดบิล (subtotal %)', v_res.subtotal;
  END IF;

  SELECT t.status INTO v_table_status FROM tables t WHERE t.id = 4;
  SELECT qs.status INTO v_session_status FROM qr_sessions qs WHERE qs.id = v_session;
  SELECT o.status INTO v_order_status FROM orders o WHERE o.id = v_order;
  SELECT COUNT(*) INTO v_pending
  FROM order_items oi WHERE oi.order_id = v_order AND oi.status = 'pending';

  IF v_table_status <> 'vacant' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: ปิดบิลแล้วโต๊ะยังเป็น %', v_table_status;
  END IF;
  IF v_session_status <> 'expired' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: ปิดบิลแล้ว QR session ยังเป็น %', v_session_status;
  END IF;
  IF v_order_status <> 'completed' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: order ยังเป็น %', v_order_status;
  END IF;
  IF v_pending <> 0 THEN
    RAISE EXCEPTION 'ไม่ผ่าน: ยังมี order_items ค้าง pending % รายการ', v_pending;
  END IF;

  RAISE NOTICE 'PASS  checkout · void ไม่เข้ายอดบิล · ปิดบิลเคลียร์โต๊ะ/QR/รายการค้างครัว';
END
$$;

-- -------------------------------------------------------------
-- ออเดอร์ที่ไม่มีจริง — ต้องคืน not_found ไม่ใช่สร้างใบเสร็จเปล่า
-- -------------------------------------------------------------
DO $$
DECLARE v_res RECORD; v_before INT; v_after INT;
BEGIN
  SELECT COUNT(*) INTO v_before FROM payments;
  SELECT * INTO v_res FROM public.complete_checkout(2147483600, 100, NULL, NULL, 0);
  SELECT COUNT(*) INTO v_after FROM payments;

  IF v_res.status <> 'not_found' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: order ที่ไม่มีจริงได้สถานะ % (ควร not_found)', v_res.status;
  END IF;
  IF v_res.payment_id IS NOT NULL OR v_after <> v_before THEN
    RAISE EXCEPTION 'ไม่ผ่าน: order ที่ไม่มีจริงยังสร้างแถวใน payments';
  END IF;

  RAISE NOTICE 'PASS  checkout · order ที่ไม่มีจริงคืน not_found และไม่เขียน payments';
END
$$;

ROLLBACK;

\echo ''
\echo '================ complete_checkout ผ่านครบ ================'
