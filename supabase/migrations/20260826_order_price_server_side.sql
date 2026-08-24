-- =============================================================
-- A4 — ราคาต่อหน่วยต้องมาจากฐานข้อมูล ไม่ใช่จากสิ่งที่ผู้เรียกส่งมา
--
--   ของเดิม: place_order_item / customer_place_order_item รับ p_unit_price
--            แล้วเขียนลง order_items ตรงๆ โดยไม่เคยอ่าน menu_items.price มาเทียบ
--            → ใครก็ตามที่เรียก RPC ได้ สั่งราคาเท่าไหร่ก็ได้ รวมถึง 0 หรือติดลบ
--
--   ของใหม่: ลบพารามิเตอร์ p_unit_price ทิ้งทั้งสองตัว แล้ว SELECT ราคาจาก menu_items เอง
--            (พร้อม DROP overload เดิมทิ้ง — ปิดหางของ A7.2 ไม่ให้เรียกของเก่าได้อีก)
--
-- หมายเหตุเรื่อง Happy Hour:
--   ยังคิดจาก menu_items.price ตามพฤติกรรมปัจจุบัน — ไม่แตะ is_happy_hour/happy_hour_price
--   ที่ยังเป็น dead column (L2) การเปิดใช้ราคา Happy Hour เป็นการเปลี่ยนราคาขายจริง
--   ต้องเป็นการตัดสินใจของเจ้าของร้าน ไม่ใช่ผลข้างเคียงของการปิดช่องโหว่
--
-- แถมในไฟล์นี้: ล็อกแถว tables ก่อนหาบิล active (บรรเทา A7.4 — เดิมล็อก menu_items
--   ซึ่งไม่กันการเปิดบิลซ้ำต่อโต๊ะเมื่อสองคนสั่งคนละเมนูพร้อมกัน)
--   ส่วน unique index กันบิลซ้ำยังเป็นงานของ A7.4 เพราะต้องจัดการข้อมูลเดิมที่ซ้ำอยู่ก่อน
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. place_order_item (เครื่อง POS)
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.place_order_item(INT, INT, INT, NUMERIC, VARCHAR);

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
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN FALSE; END IF;

  -- ล็อกโต๊ะก่อนเสมอ (ลำดับล็อก: tables → menu_items ทั้งสองฟังก์ชัน เพื่อไม่ให้ deadlock)
  PERFORM 1 FROM tables WHERE id = p_table_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- ราคามาจากที่นี่ที่เดียว
  SELECT mi.price, mi.stock, mi.is_stock_tracked
    INTO v_price, v_stock, v_tracked
  FROM menu_items mi WHERE mi.id = p_menu_item_id FOR UPDATE;

  IF v_price IS NULL THEN RETURN FALSE; END IF;          -- ไม่มีเมนูนี้
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
  'สั่งอาหารจากเครื่อง POS — ราคาต่อหน่วยอ่านจาก menu_items.price ฝั่ง DB (A4)';

-- -------------------------------------------------------------
-- 2. customer_place_order_item (หน้าลูกค้า ผ่าน server tier เท่านั้น)
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.customer_place_order_item(UUID, INT, INT, NUMERIC, VARCHAR);

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

  SELECT mi.price, mi.stock, mi.is_stock_tracked
    INTO v_price, v_stock, v_tracked
  FROM menu_items mi WHERE mi.id = p_menu_item_id FOR UPDATE;

  IF v_price IS NULL THEN RETURN FALSE; END IF;
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
  'ลูกค้าสั่งผ่าน QR — ตรวจ session + ราคาอ่านจาก menu_items.price ฝั่ง DB (A4) '
  'เรียกได้เฉพาะ service_role ผ่าน /api/customer/[session_id]/order';

-- -------------------------------------------------------------
-- 3. สิทธิ์ — signature เปลี่ยน ต้อง grant ใหม่ (ของเดิมหายไปพร้อม DROP)
-- -------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.place_order_item(INT, INT, INT, VARCHAR),
  public.customer_place_order_item(UUID, INT, INT, VARCHAR)
  FROM PUBLIC, anon, authenticated;

-- เครื่อง POS (JWT พนักงาน) เรียกตัวนี้ได้ตรง
GRANT EXECUTE ON FUNCTION public.place_order_item(INT, INT, INT, VARCHAR)
  TO authenticated, service_role;

-- ฝั่งลูกค้าไม่มี credential — ผ่าน server tier เท่านั้น
GRANT EXECUTE ON FUNCTION public.customer_place_order_item(UUID, INT, INT, VARCHAR)
  TO service_role;

COMMIT;
