-- =============================================================
-- M2 Sprint C — POS + เมนู (L2 · L18)
--
--   L2  — ใช้ happy_hour_price ตอนสั่ง (17:00–19:00 Asia/Bangkok)
--   L18 — อัปเดต tables.updated_at เมื่อ status เปลี่ยน
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. ราคาขายมีผล — สอดคล้องกับ lib/menuPrice.ts และ agent/rules
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.menu_item_sale_price(
  p_is_happy_hour      BOOLEAN,
  p_price              DECIMAL(10, 2),
  p_happy_hour_price   DECIMAL(10, 2),
  p_at                 TIMESTAMPTZ DEFAULT NOW()
) RETURNS DECIMAL(10, 2)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(p_is_happy_hour, FALSE)
         AND p_happy_hour_price IS NOT NULL
         AND p_happy_hour_price > 0
         AND (p_at AT TIME ZONE 'Asia/Bangkok')::TIME >= TIME '17:00'
         AND (p_at AT TIME ZONE 'Asia/Bangkok')::TIME < TIME '19:00'
    THEN p_happy_hour_price
    ELSE p_price
  END;
$$;

COMMENT ON FUNCTION public.menu_item_sale_price(BOOLEAN, DECIMAL, DECIMAL, TIMESTAMPTZ) IS
  'ราคาขายต่อหน่วย — Happy Hour 17:00–19:00 Asia/Bangkok (L2)';

REVOKE EXECUTE ON FUNCTION public.menu_item_sale_price(BOOLEAN, DECIMAL, DECIMAL, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------
-- 2. place_order_item — ราคาจาก menu_item_sale_price
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order_item(
  p_table_id     INT,
  p_menu_item_id INT,
  p_quantity     INT,
  p_notes        VARCHAR(255) DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_order_id INT;
  v_price    DECIMAL(10, 2);
  v_stock    INT;
  v_tracked  BOOLEAN;
  v_hh       BOOLEAN;
  v_hh_price DECIMAL(10, 2);
  v_base     DECIMAL(10, 2);
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN FALSE; END IF;

  PERFORM 1 FROM tables WHERE id = p_table_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  SELECT mi.price, mi.stock, mi.is_stock_tracked, mi.is_happy_hour, mi.happy_hour_price
    INTO v_base, v_stock, v_tracked, v_hh, v_hh_price
  FROM menu_items mi WHERE mi.id = p_menu_item_id FOR UPDATE;

  IF v_base IS NULL THEN RETURN FALSE; END IF;

  v_price := public.menu_item_sale_price(v_hh, v_base, v_hh_price, NOW());

  IF v_tracked AND v_stock < p_quantity THEN RETURN FALSE; END IF;

  SELECT o.id INTO v_order_id
  FROM orders o WHERE o.table_id = p_table_id AND o.status = 'active' LIMIT 1;

  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, status) VALUES (p_table_id, 'active')
    RETURNING id INTO v_order_id;
  END IF;

  UPDATE tables SET status = 'occupied'
  WHERE id = p_table_id AND status <> 'checking_out';

  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes)
  VALUES (v_order_id, p_menu_item_id, p_quantity, v_price, p_notes);

  IF v_tracked THEN
    UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id;
  END IF;

  RETURN TRUE;
END;
$fn$;

COMMENT ON FUNCTION public.place_order_item(INT, INT, INT, VARCHAR) IS
  'สั่งอาหารจากเครื่อง POS — ราคาต่อหน่วยจาก menu_item_sale_price (L2)';

-- -------------------------------------------------------------
-- 3. customer_place_order_item
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.customer_place_order_item(
  p_session_id   UUID,
  p_menu_item_id INT,
  p_quantity     INT,
  p_notes        VARCHAR(255) DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_table_id       INT;
  v_session_status VARCHAR(20);
  v_expired_at     TIMESTAMPTZ;
  v_order_id       INT;
  v_price          DECIMAL(10, 2);
  v_stock          INT;
  v_tracked        BOOLEAN;
  v_hh             BOOLEAN;
  v_hh_price       DECIMAL(10, 2);
  v_base           DECIMAL(10, 2);
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN FALSE; END IF;

  SELECT qs.table_id, qs.status, qs.expired_at
    INTO v_table_id, v_session_status, v_expired_at
  FROM qr_sessions qs WHERE qs.id = p_session_id;

  IF v_table_id IS NULL THEN RETURN FALSE; END IF;
  IF v_session_status <> 'active' THEN RETURN FALSE; END IF;
  IF v_expired_at IS NOT NULL AND v_expired_at < NOW() THEN
    UPDATE qr_sessions SET status = 'expired' WHERE id = p_session_id;
    RETURN FALSE;
  END IF;

  PERFORM 1 FROM tables WHERE id = v_table_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  SELECT mi.price, mi.stock, mi.is_stock_tracked, mi.is_happy_hour, mi.happy_hour_price
    INTO v_base, v_stock, v_tracked, v_hh, v_hh_price
  FROM menu_items mi WHERE mi.id = p_menu_item_id FOR UPDATE;

  IF v_base IS NULL THEN RETURN FALSE; END IF;

  v_price := public.menu_item_sale_price(v_hh, v_base, v_hh_price, NOW());

  IF v_tracked AND v_stock < p_quantity THEN RETURN FALSE; END IF;

  SELECT o.id INTO v_order_id
  FROM orders o WHERE o.table_id = v_table_id AND o.status = 'active' LIMIT 1;

  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, qr_session_id, status)
    VALUES (v_table_id, p_session_id, 'active')
    RETURNING id INTO v_order_id;
  END IF;

  UPDATE tables SET status = 'occupied'
  WHERE id = v_table_id AND status <> 'checking_out';

  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes)
  VALUES (v_order_id, p_menu_item_id, p_quantity, v_price, p_notes);

  IF v_tracked THEN
    UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id;
  END IF;

  RETURN TRUE;
END;
$fn$;

COMMENT ON FUNCTION public.customer_place_order_item(UUID, INT, INT, VARCHAR) IS
  'ลูกค้าสั่งผ่าน QR — ราคาจาก menu_item_sale_price (L2)';

-- -------------------------------------------------------------
-- 4. place_order_batch
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
  v_hh         BOOLEAN;
  v_hh_price   DECIMAL(10, 2);
  v_base       DECIMAL(10, 2);
  v_line       RECORD;
  v_agg        RECORD;
BEGIN
  PERFORM 1 FROM tables WHERE id = p_table_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_table';
  END IF;

  FOR v_agg IN
    SELECT p.menu_item_id, SUM(p.quantity)::INT AS total_qty
    FROM public._parse_order_items_json(p_items) p
    GROUP BY p.menu_item_id
    ORDER BY p.menu_item_id
  LOOP
    SELECT mi.price, mi.stock, mi.is_stock_tracked, mi.is_happy_hour, mi.happy_hour_price
      INTO v_base, v_stock, v_tracked, v_hh, v_hh_price
    FROM menu_items mi
    WHERE mi.id = v_agg.menu_item_id
    FOR UPDATE;

    IF v_base IS NULL THEN
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
    SELECT mi.price, mi.is_happy_hour, mi.happy_hour_price
      INTO v_base, v_hh, v_hh_price
    FROM menu_items mi WHERE mi.id = v_line.menu_item_id;

    v_price := public.menu_item_sale_price(v_hh, v_base, v_hh_price, NOW());

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
  'สั่งหลายรายการจาก POS — ราคาจาก menu_item_sale_price (L2)';

-- -------------------------------------------------------------
-- 5. customer_place_order_batch
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
  v_hh             BOOLEAN;
  v_hh_price       DECIMAL(10, 2);
  v_base           DECIMAL(10, 2);
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
    SELECT mi.price, mi.stock, mi.is_stock_tracked, mi.is_happy_hour, mi.happy_hour_price
      INTO v_base, v_stock, v_tracked, v_hh, v_hh_price
    FROM menu_items mi
    WHERE mi.id = v_agg.menu_item_id
    FOR UPDATE;

    IF v_base IS NULL THEN
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
    SELECT mi.price, mi.is_happy_hour, mi.happy_hour_price
      INTO v_base, v_hh, v_hh_price
    FROM menu_items mi WHERE mi.id = v_line.menu_item_id;

    v_price := public.menu_item_sale_price(v_hh, v_base, v_hh_price, NOW());

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
  'ลูกค้าสั่งหลายรายการ — ราคาจาก menu_item_sale_price (L2)';

-- -------------------------------------------------------------
-- 6. L18 — tables.updated_at เมื่อ status เปลี่ยน
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tables_touch_updated_at_on_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- clock_timestamp() ไม่คงที่ใน transaction (ต่างจาก NOW()) — กันค่าเดิมเมื่อ RPC หลายขั้นใน batch
    NEW.updated_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.tables_touch_updated_at_on_status()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tables_status_updated_at ON tables;

CREATE TRIGGER tables_status_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION public.tables_touch_updated_at_on_status();

COMMIT;
