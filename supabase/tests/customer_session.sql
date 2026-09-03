-- =============================================================
-- M3 — เส้นทางฝั่งลูกค้า (QR session)
--
-- order_batch.sql ครอบไว้แล้วว่า customer_place_order_batch สั่งสำเร็จ
-- ไฟล์นี้ไล่ "ทางที่ต้องถูกปฏิเสธ" ซึ่งเป็นด่านเดียวที่กันคนที่ไม่ได้นั่งโต๊ะนั้น:
-- session ไม่มีจริง · หมดสถานะ · หมดอายุ · โต๊ะอื่น · ราคา/สต็อกจาก DB
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

CREATE FUNCTION pg_temp.reset_table(p_table_id INT) RETURNS VOID
LANGUAGE plpgsql AS $fn$
BEGIN
  DELETE FROM payments    WHERE order_id IN (SELECT id FROM orders WHERE table_id = p_table_id);
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE table_id = p_table_id);
  DELETE FROM orders      WHERE table_id = p_table_id;
  UPDATE qr_sessions SET status = 'expired' WHERE table_id = p_table_id AND status = 'active';
  UPDATE tables SET status = 'vacant' WHERE id = p_table_id;
END;
$fn$;

CREATE FUNCTION pg_temp.one_item(p_menu_id INT, p_qty INT) RETURNS JSONB
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT jsonb_build_array(jsonb_build_object('menu_item_id', p_menu_id, 'quantity', p_qty));
$fn$;

-- -------------------------------------------------------------
-- session ที่ใช้ไม่ได้ต้องถูกปฏิเสธทุกกรณี
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu    INT;
  v_expired UUID;
  v_stale   UUID;
BEGIN
  SELECT id INTO v_menu FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu;

  -- 1. session ที่ไม่มีในฐานเลย
  BEGIN
    PERFORM public.customer_place_order_batch(
      '00000000-0000-4000-8000-000000000000'::UUID, pg_temp.one_item(v_menu, 1));
    RAISE EXCEPTION 'ไม่ผ่าน: session ที่ไม่มีจริงยังสั่งได้';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%invalid_session%' THEN
      RAISE EXCEPTION 'ไม่ผ่าน: คาดหวัง invalid_session ได้ %', SQLERRM;
    END IF;
  END;

  -- 2. session ที่ถูกปิดไปแล้ว (ปิดบิลแล้ว/พนักงานยกเลิก)
  INSERT INTO qr_sessions (table_id, status, expired_at)
  VALUES (2, 'expired', NOW() + INTERVAL '2 hours')
  RETURNING id INTO v_stale;

  BEGIN
    PERFORM public.customer_place_order_batch(v_stale, pg_temp.one_item(v_menu, 1));
    RAISE EXCEPTION 'ไม่ผ่าน: session ที่ปิดแล้วยังสั่งได้';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%session_not_active%' THEN
      RAISE EXCEPTION 'ไม่ผ่าน: คาดหวัง session_not_active ได้ %', SQLERRM;
    END IF;
  END;

  -- 3. session ที่ยัง active แต่เลยเวลาหมดอายุ (QR เก่าที่ลูกค้าเก็บรูปไว้)
  INSERT INTO qr_sessions (table_id, status, expired_at)
  VALUES (2, 'active', NOW() - INTERVAL '1 minute')
  RETURNING id INTO v_expired;

  BEGIN
    PERFORM public.customer_place_order_batch(v_expired, pg_temp.one_item(v_menu, 1));
    RAISE EXCEPTION 'ไม่ผ่าน: QR ที่หมดอายุยังสั่งได้';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%session_expired%' THEN
      RAISE EXCEPTION 'ไม่ผ่าน: คาดหวัง session_expired ได้ %', SQLERRM;
    END IF;
  END;

  RAISE NOTICE 'PASS  customer · session ไม่มีจริง / ปิดแล้ว / หมดอายุ ถูกปฏิเสธทั้งสามทาง';
END
$$;

-- -------------------------------------------------------------
-- ออเดอร์ต้องผูกกับโต๊ะของ session นั้นเท่านั้น
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu       INT;
  v_session    UUID;
  v_result     JSONB;
  v_order_id   INT;
  v_order_tbl  INT;
  v_linked     UUID;
  v_other_cnt  INT;
BEGIN
  SELECT id INTO v_menu FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu;

  PERFORM pg_temp.reset_table(3);
  PERFORM pg_temp.reset_table(4);

  -- โต๊ะ 4 มีบิลของตัวเองอยู่ก่อน — ลูกค้าโต๊ะ 3 ต้องไม่ไปเพิ่มรายการในบิลนั้น
  PERFORM public.place_order_item(4, v_menu, 1, NULL);

  INSERT INTO qr_sessions (table_id, status, expired_at)
  VALUES (3, 'active', NOW() + INTERVAL '2 hours')
  RETURNING id INTO v_session;

  v_result := public.customer_place_order_batch(v_session, pg_temp.one_item(v_menu, 2));
  v_order_id := (v_result ->> 'order_id')::INT;

  SELECT o.table_id, o.qr_session_id INTO v_order_tbl, v_linked
  FROM orders o WHERE o.id = v_order_id;

  IF v_order_tbl <> 3 THEN
    RAISE EXCEPTION 'ไม่ผ่าน: ออเดอร์ไปอยู่โต๊ะ % แทนโต๊ะของ session (3)', v_order_tbl;
  END IF;
  IF v_linked IS DISTINCT FROM v_session THEN
    RAISE EXCEPTION 'ไม่ผ่าน: orders.qr_session_id ไม่ได้ผูกกับ session ที่สั่ง';
  END IF;

  SELECT COUNT(*) INTO v_other_cnt
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.table_id = 4;

  IF v_other_cnt <> 1 THEN
    RAISE EXCEPTION 'ไม่ผ่าน: บิลของโต๊ะ 4 ถูกแตะ (มี % รายการ)', v_other_cnt;
  END IF;

  IF (SELECT status FROM tables WHERE id = 3) <> 'occupied' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: สั่งแล้วโต๊ะ 3 ไม่ถูกตั้งเป็น occupied';
  END IF;

  RAISE NOTICE 'PASS  customer · ออเดอร์ผูกกับโต๊ะของ session และไม่แตะบิลโต๊ะอื่น';
END
$$;

-- -------------------------------------------------------------
-- ราคาและสต็อกมาจาก DB — client ส่งได้แค่ menu_item_id / quantity / notes (A4)
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu   INT;
  v_session UUID;
  v_result JSONB;
  v_unit   DECIMAL(10, 2);
  v_stock  INT;
  v_args   TEXT;
BEGIN
  SELECT pg_get_function_arguments(p.oid) INTO v_args
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'customer_place_order_batch';

  IF v_args ILIKE '%price%' THEN
    RAISE EXCEPTION 'A4 ไม่ผ่าน: customer_place_order_batch ยังรับราคาจาก client (%)', v_args;
  END IF;

  SELECT id INTO v_menu FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items
  SET price = 77, is_happy_hour = FALSE, happy_hour_price = NULL,
      stock = 10, is_stock_tracked = TRUE
  WHERE id = v_menu;

  PERFORM pg_temp.reset_table(1);
  INSERT INTO qr_sessions (table_id, status, expired_at)
  VALUES (1, 'active', NOW() + INTERVAL '2 hours')
  RETURNING id INTO v_session;

  v_result := public.customer_place_order_batch(v_session, pg_temp.one_item(v_menu, 3));

  SELECT oi.unit_price INTO v_unit
  FROM order_items oi WHERE oi.order_id = (v_result ->> 'order_id')::INT LIMIT 1;
  SELECT stock INTO v_stock FROM menu_items WHERE id = v_menu;

  IF v_unit <> 77 THEN
    RAISE EXCEPTION 'A4 ไม่ผ่าน: unit_price % ไม่ตรงราคาใน menu_items (77)', v_unit;
  END IF;
  IF v_stock <> 7 THEN
    RAISE EXCEPTION 'ไม่ผ่าน: สต็อกควรเหลือ 7 หลังสั่ง 3 ได้ %', v_stock;
  END IF;

  -- สั่งเกินสต็อก → ทั้ง batch ต้องถูกปฏิเสธ
  BEGIN
    PERFORM public.customer_place_order_batch(v_session, pg_temp.one_item(v_menu, 99));
    RAISE EXCEPTION 'ไม่ผ่าน: ลูกค้าสั่งเกินสต็อกได้';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%insufficient_stock%' THEN
      RAISE EXCEPTION 'ไม่ผ่าน: คาดหวัง insufficient_stock ได้ %', SQLERRM;
    END IF;
  END;

  -- เมนูที่ไม่มีจริง → ปฏิเสธ ไม่ใช่ข้ามเงียบ
  BEGIN
    PERFORM public.customer_place_order_batch(v_session, pg_temp.one_item(2147483600, 1));
    RAISE EXCEPTION 'ไม่ผ่าน: สั่งเมนูที่ไม่มีจริงได้';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%menu_not_found%' THEN
      RAISE EXCEPTION 'ไม่ผ่าน: คาดหวัง menu_not_found ได้ %', SQLERRM;
    END IF;
  END;

  RAISE NOTICE 'PASS  customer · ราคาจาก menu_items · หักสต็อกถูก · สั่งเกินสต็อก/เมนูผีถูกปฏิเสธ';
END
$$;

-- -------------------------------------------------------------
-- customer_place_order_item (ทางรายการเดียว) — คืน FALSE เงียบๆ ไม่ใช่ปล่อยผ่าน
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu    INT;
  v_session UUID;
  v_stale   UUID;
  v_unit    DECIMAL(10, 2);
  v_expect  DECIMAL(10, 2);
BEGIN
  SELECT id INTO v_menu FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 10, is_stock_tracked = TRUE WHERE id = v_menu;
  SELECT public.menu_item_sale_price(is_happy_hour, price, happy_hour_price, NOW())
  INTO v_expect FROM menu_items WHERE id = v_menu;

  PERFORM pg_temp.reset_table(4);
  INSERT INTO qr_sessions (table_id, status, expired_at)
  VALUES (4, 'active', NOW() + INTERVAL '2 hours')
  RETURNING id INTO v_session;

  INSERT INTO qr_sessions (table_id, status, expired_at)
  VALUES (4, 'active', NOW() - INTERVAL '1 minute')
  RETURNING id INTO v_stale;

  IF public.customer_place_order_item(
       '00000000-0000-4000-8000-000000000000'::UUID, v_menu, 1, NULL) THEN
    RAISE EXCEPTION 'ไม่ผ่าน: session ที่ไม่มีจริงสั่งรายการเดียวได้';
  END IF;
  IF public.customer_place_order_item(v_stale, v_menu, 1, NULL) THEN
    RAISE EXCEPTION 'ไม่ผ่าน: QR หมดอายุสั่งรายการเดียวได้';
  END IF;
  IF public.customer_place_order_item(v_session, v_menu, 0, NULL) THEN
    RAISE EXCEPTION 'ไม่ผ่าน: สั่งจำนวน 0 ได้';
  END IF;
  IF public.customer_place_order_item(v_session, v_menu, 99, NULL) THEN
    RAISE EXCEPTION 'ไม่ผ่าน: สั่งเกินสต็อกได้';
  END IF;
  IF public.customer_place_order_item(v_session, 2147483600, 1, NULL) THEN
    RAISE EXCEPTION 'ไม่ผ่าน: สั่งเมนูที่ไม่มีจริงได้';
  END IF;

  IF NOT public.customer_place_order_item(v_session, v_menu, 2, 'ไม่ใส่ผัก') THEN
    RAISE EXCEPTION 'ไม่ผ่าน: session ที่ใช้ได้กลับสั่งไม่สำเร็จ';
  END IF;

  SELECT oi.unit_price INTO v_unit
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.table_id = 4 ORDER BY oi.id DESC LIMIT 1;

  IF v_unit IS DISTINCT FROM v_expect THEN
    RAISE EXCEPTION 'ไม่ผ่าน: unit_price % ไม่ตรงราคาขาย % ณ เวลานี้', v_unit, v_expect;
  END IF;

  RAISE NOTICE 'PASS  customer · customer_place_order_item ปฏิเสธ session/จำนวน/สต็อก/เมนูที่ใช้ไม่ได้';
END
$$;

-- -------------------------------------------------------------
-- payload ที่ผิดรูปต้องไม่ผ่านด่าน _parse_order_items_json
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu INT; v_session UUID; v_bad JSONB; v_case TEXT;
BEGIN
  SELECT id INTO v_menu FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 100, is_stock_tracked = TRUE WHERE id = v_menu;

  PERFORM pg_temp.reset_table(2);
  INSERT INTO qr_sessions (table_id, status, expired_at)
  VALUES (2, 'active', NOW() + INTERVAL '2 hours')
  RETURNING id INTO v_session;

  FOREACH v_case IN ARRAY ARRAY['empty', 'zero_qty', 'negative_qty', 'too_many_qty', 'no_menu']
  LOOP
    v_bad := CASE v_case
      WHEN 'empty'        THEN '[]'::JSONB
      WHEN 'zero_qty'     THEN pg_temp.one_item(v_menu, 0)
      WHEN 'negative_qty' THEN pg_temp.one_item(v_menu, -5)
      WHEN 'too_many_qty' THEN pg_temp.one_item(v_menu, 100)
      ELSE jsonb_build_array(jsonb_build_object('quantity', 1))
    END;

    BEGIN
      PERFORM public.customer_place_order_batch(v_session, v_bad);
      RAISE EXCEPTION 'ไม่ผ่าน: payload แบบ % ผ่านด่านตรวจไปได้', v_case;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%invalid_item%' THEN
        RAISE EXCEPTION 'ไม่ผ่าน (%): คาดหวัง invalid_item(s) ได้ %', v_case, SQLERRM;
      END IF;
    END;
  END LOOP;

  RAISE NOTICE 'PASS  customer · payload ว่าง / จำนวน <= 0 / เกิน 99 / ไม่มี menu_item_id ถูกปฏิเสธ';
END
$$;

ROLLBACK;

\echo ''
\echo '================ customer QR session ผ่านครบ ================'
