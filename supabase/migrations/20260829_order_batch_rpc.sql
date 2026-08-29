-- =============================================================
-- M1 / D3 — สั่งอาหารหลายรายการใน transaction เดียว (แก้ L8)
--
--   place_order_batch          — เครื่อง POS ผ่าน /api/orders
--   customer_place_order_batch — หน้าลูกค้า ผ่าน /api/customer/[session_id]/order
--
--   ถ้ารายการใดล้มเหลว (สต็อกไม่พอ / เมนูไม่มี) ทั้ง batch rollback ไม่ทิ้งรายการค้างครึ่งก้อน
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- Helper: แปลง JSONB array เป็นรายการที่ validate แล้ว
--   [{"menu_item_id": 1, "quantity": 2, "notes": "..."}]
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._parse_order_items_json(p_items JSONB)
RETURNS TABLE (
  ord        INT,
  menu_item_id INT,
  quantity   INT,
  notes      VARCHAR(255)
)
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $fn$
DECLARE
  v_len INT;
  v_elem JSONB;
  v_menu INT;
  v_qty  INT;
  v_notes TEXT;
  i INT;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'invalid_items';
  END IF;

  v_len := jsonb_array_length(p_items);
  IF v_len = 0 OR v_len > 40 THEN
    RAISE EXCEPTION 'invalid_items';
  END IF;

  FOR i IN 0 .. v_len - 1 LOOP
    v_elem := p_items -> i;
    v_menu := NULLIF(v_elem ->> 'menu_item_id', '')::INT;
    v_qty  := NULLIF(v_elem ->> 'quantity', '')::INT;
    v_notes := NULLIF(TRIM(v_elem ->> 'notes'), '');

    IF v_menu IS NULL OR v_menu <= 0 THEN
      RAISE EXCEPTION 'invalid_item';
    END IF;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 99 THEN
      RAISE EXCEPTION 'invalid_item';
    END IF;
    IF v_notes IS NOT NULL AND length(v_notes) > 255 THEN
      v_notes := left(v_notes, 255);
    END IF;

    ord := i + 1;
    menu_item_id := v_menu;
    quantity := v_qty;
    notes := v_notes;
    RETURN NEXT;
  END LOOP;
END;
$fn$;

-- -------------------------------------------------------------
-- 1. place_order_batch (staff / POS)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order_batch(
  p_table_id INT,
  p_items    JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_order_id   INT;
  v_price      DECIMAL(10, 2);
  v_stock      INT;
  v_tracked    BOOLEAN;
  v_needed     INT;
  v_line       RECORD;
  v_agg        RECORD;
BEGIN
  PERFORM 1 FROM tables WHERE id = p_table_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_table';
  END IF;

  -- รวมจำนวนต่อเมนูเพื่อเช็คสต็อก (ตะกร้าอาจมีหลายแถวเมนูเดียวกัน)
  FOR v_agg IN
    SELECT p.menu_item_id, SUM(p.quantity)::INT AS total_qty
    FROM public._parse_order_items_json(p_items) p
    GROUP BY p.menu_item_id
    ORDER BY p.menu_item_id
  LOOP
    SELECT mi.price, mi.stock, mi.is_stock_tracked
      INTO v_price, v_stock, v_tracked
    FROM menu_items mi
    WHERE mi.id = v_agg.menu_item_id
    FOR UPDATE;

    IF v_price IS NULL THEN
      RAISE EXCEPTION 'menu_not_found:%', v_agg.menu_item_id;
    END IF;
    IF v_tracked AND v_stock < v_agg.total_qty THEN
      RAISE EXCEPTION 'insufficient_stock:%', v_agg.menu_item_id;
    END IF;
  END LOOP;

  SELECT o.id INTO v_order_id
  FROM orders o
  WHERE o.table_id = p_table_id AND o.status = 'active'
  LIMIT 1;

  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, status)
    VALUES (p_table_id, 'active')
    RETURNING id INTO v_order_id;
  END IF;

  UPDATE tables SET status = 'occupied'
  WHERE id = p_table_id AND status <> 'checking_out';

  FOR v_line IN
    SELECT p.ord, p.menu_item_id, p.quantity, p.notes
    FROM public._parse_order_items_json(p_items) p
    ORDER BY p.ord
  LOOP
    SELECT mi.price INTO v_price
    FROM menu_items mi WHERE mi.id = v_line.menu_item_id;

    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes)
    VALUES (v_order_id, v_line.menu_item_id, v_line.quantity, v_price, v_line.notes);
  END LOOP;

  FOR v_agg IN
    SELECT p.menu_item_id, SUM(p.quantity)::INT AS total_qty
    FROM public._parse_order_items_json(p_items) p
    GROUP BY p.menu_item_id
  LOOP
    UPDATE menu_items mi
    SET stock = mi.stock - v_agg.total_qty
    WHERE mi.id = v_agg.menu_item_id AND mi.is_stock_tracked;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'placed', jsonb_array_length(p_items)
  );
END;
$fn$;

COMMENT ON FUNCTION public.place_order_batch(INT, JSONB) IS
  'สั่งหลายรายการจาก POS ใน transaction เดียว (M1/D3) — เรียกผ่าน /api/orders';

-- -------------------------------------------------------------
-- 2. customer_place_order_batch (QR portal)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.customer_place_order_batch(
  p_session_id UUID,
  p_items      JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_table_id       INT;
  v_session_status VARCHAR(20);
  v_expired_at     TIMESTAMPTZ;
  v_order_id       INT;
  v_price          DECIMAL(10, 2);
  v_stock          INT;
  v_tracked        BOOLEAN;
  v_line           RECORD;
  v_agg            RECORD;
BEGIN
  SELECT qs.table_id, qs.status, qs.expired_at
    INTO v_table_id, v_session_status, v_expired_at
  FROM qr_sessions qs WHERE qs.id = p_session_id;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'invalid_session';
  END IF;
  IF v_session_status <> 'active' THEN
    RAISE EXCEPTION 'session_not_active';
  END IF;
  IF v_expired_at IS NOT NULL AND v_expired_at < NOW() THEN
    UPDATE qr_sessions SET status = 'expired' WHERE id = p_session_id;
    RAISE EXCEPTION 'session_expired';
  END IF;

  PERFORM 1 FROM tables WHERE id = v_table_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_table';
  END IF;

  FOR v_agg IN
    SELECT p.menu_item_id, SUM(p.quantity)::INT AS total_qty
    FROM public._parse_order_items_json(p_items) p
    GROUP BY p.menu_item_id
    ORDER BY p.menu_item_id
  LOOP
    SELECT mi.price, mi.stock, mi.is_stock_tracked
      INTO v_price, v_stock, v_tracked
    FROM menu_items mi
    WHERE mi.id = v_agg.menu_item_id
    FOR UPDATE;

    IF v_price IS NULL THEN
      RAISE EXCEPTION 'menu_not_found:%', v_agg.menu_item_id;
    END IF;
    IF v_tracked AND v_stock < v_agg.total_qty THEN
      RAISE EXCEPTION 'insufficient_stock:%', v_agg.menu_item_id;
    END IF;
  END LOOP;

  SELECT o.id INTO v_order_id
  FROM orders o
  WHERE o.table_id = v_table_id AND o.status = 'active'
  LIMIT 1;

  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, qr_session_id, status)
    VALUES (v_table_id, p_session_id, 'active')
    RETURNING id INTO v_order_id;
  END IF;

  UPDATE tables SET status = 'occupied'
  WHERE id = v_table_id AND status <> 'checking_out';

  FOR v_line IN
    SELECT p.ord, p.menu_item_id, p.quantity, p.notes
    FROM public._parse_order_items_json(p_items) p
    ORDER BY p.ord
  LOOP
    SELECT mi.price INTO v_price
    FROM menu_items mi WHERE mi.id = v_line.menu_item_id;

    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes)
    VALUES (v_order_id, v_line.menu_item_id, v_line.quantity, v_price, v_line.notes);
  END LOOP;

  FOR v_agg IN
    SELECT p.menu_item_id, SUM(p.quantity)::INT AS total_qty
    FROM public._parse_order_items_json(p_items) p
    GROUP BY p.menu_item_id
  LOOP
    UPDATE menu_items mi
    SET stock = mi.stock - v_agg.total_qty
    WHERE mi.id = v_agg.menu_item_id AND mi.is_stock_tracked;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'placed', jsonb_array_length(p_items)
  );
END;
$fn$;

COMMENT ON FUNCTION public.customer_place_order_batch(UUID, JSONB) IS
  'ลูกค้าสั่งหลายรายการใน transaction เดียว (M1/D3) — เรียกผ่าน /api/customer/[session_id]/order';

-- -------------------------------------------------------------
-- 3. สิทธิ์ — helper ไม่ให้ PUBLIC เรียก
-- -------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public._parse_order_items_json(JSONB) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION
  public.place_order_batch(INT, JSONB),
  public.customer_place_order_batch(UUID, JSONB)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.place_order_batch(INT, JSONB)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.customer_place_order_batch(UUID, JSONB)
  TO service_role;

COMMIT;
