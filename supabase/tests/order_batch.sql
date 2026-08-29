-- =============================================================
-- M1/D3 — place_order_batch atomicity
--
--   pnpm db:test (ร่วมกับ security.sql / a7_audit.sql)
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

-- -------------------------------------------------------------
-- สั่ง batch สำเร็จ — ทุกรายการเข้า order_items
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu1 INT;
  v_menu2 INT;
  v_result JSONB;
  v_order_id INT;
  v_item_count INT;
BEGIN
  SELECT id INTO v_menu1 FROM menu_items ORDER BY id LIMIT 1;
  SELECT id INTO v_menu2 FROM menu_items ORDER BY id OFFSET 1 LIMIT 1;

  UPDATE tables SET status = 'vacant' WHERE id = 2;
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE table_id = 2);
  DELETE FROM orders WHERE table_id = 2;

  UPDATE menu_items SET stock = 50, is_stock_tracked = TRUE WHERE id = v_menu1;
  UPDATE menu_items SET stock = 50, is_stock_tracked = TRUE WHERE id = v_menu2;

  v_result := public.place_order_batch(
    2,
    jsonb_build_array(
      jsonb_build_object('menu_item_id', v_menu1, 'quantity', 2, 'notes', 'เผ็ดน้อย'),
      jsonb_build_object('menu_item_id', v_menu2, 'quantity', 1, 'notes', NULL)
    )
  );

  IF (v_result ->> 'placed')::INT <> 2 THEN
    RAISE EXCEPTION 'D3 ไม่ผ่าน: placed ควรเป็น 2 ได้ %', v_result;
  END IF;

  v_order_id := (v_result ->> 'order_id')::INT;
  SELECT COUNT(*) INTO v_item_count FROM order_items WHERE order_id = v_order_id;

  IF v_item_count <> 2 THEN
    RAISE EXCEPTION 'D3 ไม่ผ่าน: ควรมี 2 order_items ได้ %', v_item_count;
  END IF;

  RAISE NOTICE 'PASS  D3 · place_order_batch สั่ง 2 รายการสำเร็จ';
END
$$;

-- -------------------------------------------------------------
-- สต็อกไม่พอ — ทั้ง batch rollback ไม่ทิ้งรายการค้าง
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu1 INT;
  v_menu2 INT;
  v_items_before INT;
  v_items_after INT;
BEGIN
  SELECT id INTO v_menu1 FROM menu_items ORDER BY id LIMIT 1;
  SELECT id INTO v_menu2 FROM menu_items ORDER BY id OFFSET 1 LIMIT 1;

  UPDATE tables SET status = 'vacant' WHERE id = 3;
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE table_id = 3);
  DELETE FROM orders WHERE table_id = 3;

  UPDATE menu_items SET stock = 50, is_stock_tracked = TRUE WHERE id = v_menu1;
  UPDATE menu_items SET stock = 1, is_stock_tracked = TRUE WHERE id = v_menu2;

  SELECT COUNT(*) INTO v_items_before
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.table_id = 3;

  BEGIN
    PERFORM public.place_order_batch(
      3,
      jsonb_build_array(
        jsonb_build_object('menu_item_id', v_menu1, 'quantity', 1),
        jsonb_build_object('menu_item_id', v_menu2, 'quantity', 5)
      )
    );
    RAISE EXCEPTION 'D3 ไม่ผ่าน: batch ที่สต็อกไม่พอควรล้มเหลว';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%insufficient_stock%' THEN
        RAISE EXCEPTION 'D3 ไม่ผ่าน: คาดหวัง insufficient_stock ได้ %', SQLERRM;
      END IF;
  END;

  SELECT COUNT(*) INTO v_items_after
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.table_id = 3;

  IF v_items_after <> v_items_before THEN
    RAISE EXCEPTION 'D3 ไม่ผ่าน: มี order_items ค้างหลัง rollback (% → %)',
      v_items_before, v_items_after;
  END IF;

  RAISE NOTICE 'PASS  D3 · สต็อกไม่พอแล้ว rollback ทั้ง batch';
END
$$;

-- -------------------------------------------------------------
-- customer_place_order_batch — ต้องมี session ที่ active
-- -------------------------------------------------------------
DO $$
DECLARE
  v_session UUID;
  v_menu INT;
  v_result JSONB;
BEGIN
  SELECT id INTO v_session FROM qr_sessions WHERE status = 'active' LIMIT 1;
  IF v_session IS NULL THEN
  INSERT INTO qr_sessions (table_id, status, expired_at)
  VALUES (4, 'active', NOW() + INTERVAL '2 hours')
  RETURNING id INTO v_session;
  END IF;

  SELECT id INTO v_menu FROM menu_items ORDER BY id LIMIT 1;
  UPDATE menu_items SET stock = 20, is_stock_tracked = TRUE WHERE id = v_menu;

  v_result := public.customer_place_order_batch(
    v_session,
    jsonb_build_array(jsonb_build_object('menu_item_id', v_menu, 'quantity', 1))
  );

  IF (v_result ->> 'placed')::INT <> 1 THEN
    RAISE EXCEPTION 'D3 ไม่ผ่าน: customer batch ควร placed = 1';
  END IF;

  RAISE NOTICE 'PASS  D3 · customer_place_order_batch สำเร็จ';
END
$$;

-- -------------------------------------------------------------
-- L2 — menu_item_sale_price + unit_price ใน batch สอดคล้องกัน
-- -------------------------------------------------------------
DO $$
DECLARE
  v_menu INT;
  v_hh   DECIMAL(10, 2);
  v_norm DECIMAL(10, 2);
  v_unit DECIMAL(10, 2);
  v_result JSONB;
  v_order_id INT;
BEGIN
  SELECT id INTO v_menu FROM menu_items ORDER BY id LIMIT 1;

  UPDATE menu_items
  SET price = 120, is_happy_hour = TRUE, happy_hour_price = 80
  WHERE id = v_menu;

  v_hh := public.menu_item_sale_price(TRUE, 120, 80, TIMESTAMPTZ '2026-08-28 18:00:00+07');
  v_norm := public.menu_item_sale_price(TRUE, 120, 80, TIMESTAMPTZ '2026-08-28 20:00:00+07');

  IF v_hh <> 80 THEN
    RAISE EXCEPTION 'L2 ไม่ผ่าน: ช่วง HH ควรได้ 80 ได้ %', v_hh;
  END IF;
  IF v_norm <> 120 THEN
    RAISE EXCEPTION 'L2 ไม่ผ่าน: นอกช่วง HH ควรได้ 120 ได้ %', v_norm;
  END IF;

  UPDATE tables SET status = 'vacant' WHERE id = 1;
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE table_id = 1);
  DELETE FROM orders WHERE table_id = 1;
  UPDATE menu_items SET stock = 50, is_stock_tracked = TRUE WHERE id = v_menu;

  v_result := public.place_order_batch(
    1,
    jsonb_build_array(jsonb_build_object('menu_item_id', v_menu, 'quantity', 1))
  );

  v_order_id := (v_result ->> 'order_id')::INT;
  SELECT unit_price INTO v_unit FROM order_items WHERE order_id = v_order_id LIMIT 1;

  IF v_unit <> public.menu_item_sale_price(TRUE, 120, 80, NOW()) THEN
    RAISE EXCEPTION 'L2 ไม่ผ่าน: unit_price (%) ไม่ตรง menu_item_sale_price ณ NOW()', v_unit;
  END IF;

  RAISE NOTICE 'PASS  L2 · Happy Hour sale price ใน order batch';
END
$$;

-- -------------------------------------------------------------
-- L18 — tables.updated_at อัปเดตเมื่อ status เปลี่ยน
-- -------------------------------------------------------------
DO $$
DECLARE
  v_before TIMESTAMPTZ;
  v_after  TIMESTAMPTZ;
  v_same   TIMESTAMPTZ;
BEGIN
  UPDATE tables SET status = 'vacant' WHERE id = 4;
  SELECT updated_at INTO v_before FROM tables WHERE id = 4;

  PERFORM pg_sleep(0.001);

  UPDATE tables SET status = 'occupied' WHERE id = 4;
  SELECT updated_at INTO v_after FROM tables WHERE id = 4;

  IF v_after <= v_before THEN
    RAISE EXCEPTION 'L18 ไม่ผ่าน: updated_at ไม่เปลี่ยนหลัง status เปลี่ยน (% → %)', v_before, v_after;
  END IF;

  v_same := v_after;
  UPDATE tables SET status = 'occupied' WHERE id = 4;
  SELECT updated_at INTO v_after FROM tables WHERE id = 4;

  IF v_after <> v_same THEN
    RAISE EXCEPTION 'L18 ไม่ผ่าน: updated_at เปลี่ยนแม้ status เหมือนเดิม (% → %)', v_same, v_after;
  END IF;

  RAISE NOTICE 'PASS  L18 · tables.updated_at เมื่อ status เปลี่ยน';
END
$$;

ROLLBACK;

\echo ''
\echo '================ D3 order batch ผ่านครบ ================'
