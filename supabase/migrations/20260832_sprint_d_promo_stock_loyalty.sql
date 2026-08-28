-- =============================================================
-- M2 Sprint D — Promo / Stock / CRM (L6 · L7 · L16)
--
--   L16 — คอลัมน์ price_per_unit ใน item_ingredients
--   L6  — upsert_purchase_order แก้ PO ใน transaction เดียว (ไม่ลบ+insert)
--   L7  — adjust_loyalty_points ล็อกแถว + บันทึก log ใน transaction เดียว
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- L16 — ราคาต่อหน่วย (แยกจาก cost รวม)
-- -------------------------------------------------------------
ALTER TABLE item_ingredients
  ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10, 2);

COMMENT ON COLUMN item_ingredients.price_per_unit IS
  'ราคาต่อหน่วย — บันทึกจริงจากฟอร์ม (L16)';

-- backfill จาก cost/quantity สำหรับข้อมูลเก่า
UPDATE item_ingredients
SET price_per_unit = ROUND(cost / quantity, 2)
WHERE price_per_unit IS NULL AND quantity > 0;

-- -------------------------------------------------------------
-- Helper: parse PO line items JSON
--   [{"id": 1, "name": "...", "quantity": 2, "unit": "กก.", "price_per_unit": 50}]
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._parse_po_items_json(p_items JSONB)
RETURNS TABLE (
  ord            INT,
  item_id        BIGINT,
  name           VARCHAR(255),
  quantity       DECIMAL(10, 2),
  unit           VARCHAR(50),
  price_per_unit DECIMAL(10, 2),
  line_cost      DECIMAL(10, 2)
)
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $fn$
DECLARE
  v_len INT;
  v_elem JSONB;
  v_id  BIGINT;
  v_name TEXT;
  v_qty DECIMAL(10, 2);
  v_unit TEXT;
  v_ppu DECIMAL(10, 2);
  i INT;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'invalid_items';
  END IF;

  v_len := jsonb_array_length(p_items);
  IF v_len = 0 OR v_len > 100 THEN
    RAISE EXCEPTION 'invalid_items';
  END IF;

  FOR i IN 0 .. v_len - 1 LOOP
    v_elem := p_items -> i;
    v_id := NULLIF(v_elem ->> 'id', '')::BIGINT;
    v_name := NULLIF(TRIM(v_elem ->> 'name'), '');
    v_qty := NULLIF(v_elem ->> 'quantity', '')::DECIMAL(10, 2);
    v_unit := NULLIF(TRIM(v_elem ->> 'unit'), '');
    v_ppu := NULLIF(v_elem ->> 'price_per_unit', '')::DECIMAL(10, 2);

    IF v_name IS NULL OR length(v_name) > 255 THEN
      RAISE EXCEPTION 'invalid_item';
    END IF;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'invalid_item';
    END IF;
    IF v_unit IS NULL OR length(v_unit) > 50 THEN
      RAISE EXCEPTION 'invalid_item';
    END IF;
    IF v_ppu IS NULL OR v_ppu < 0 THEN
      RAISE EXCEPTION 'invalid_item';
    END IF;

    ord := i + 1;
    item_id := v_id;
    name := v_name;
    quantity := v_qty;
    unit := v_unit;
    price_per_unit := v_ppu;
    line_cost := ROUND(v_qty * v_ppu, 2);
    RETURN NEXT;
  END LOOP;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public._parse_po_items_json(JSONB)
  FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------
-- L6 — สร้าง/แก้ PO + รายการวัตถุดิบใน transaction เดียว
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_purchase_order(
  p_order_id       BIGINT,
  p_purchase_date  DATE,
  p_buyer_name     VARCHAR(255),
  p_note           TEXT,
  p_items          JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_order_id   BIGINT;
  v_total      DECIMAL(10, 2);
  v_line       RECORD;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_buyer_name IS NULL OR TRIM(p_buyer_name) = '' THEN
    RAISE EXCEPTION 'invalid_buyer';
  END IF;

  SELECT COALESCE(SUM(p.line_cost), 0) INTO v_total
  FROM public._parse_po_items_json(p_items) p;

  IF p_order_id IS NULL THEN
    INSERT INTO purchase_orders (purchase_date, buyer_name, total_cost, note)
    VALUES (p_purchase_date, TRIM(p_buyer_name), v_total, NULLIF(TRIM(p_note), ''))
    RETURNING id INTO v_order_id;
  ELSE
    v_order_id := p_order_id;

    PERFORM 1 FROM purchase_orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'order_not_found';
    END IF;

    UPDATE purchase_orders
    SET purchase_date = p_purchase_date,
        buyer_name    = TRIM(p_buyer_name),
        total_cost    = v_total,
        note          = NULLIF(TRIM(p_note), '')
    WHERE id = v_order_id;

    -- ลบแถวที่ client ไม่ส่ง id กลับมา (แทนลบทั้งก้อนแล้ว insert ใหม่)
    DELETE FROM item_ingredients ii
    WHERE ii.purchase_order_id = v_order_id
      AND ii.id NOT IN (
        SELECT p.item_id
        FROM public._parse_po_items_json(p_items) p
        WHERE p.item_id IS NOT NULL
      );
  END IF;

  FOR v_line IN
    SELECT p.ord, p.item_id, p.name, p.quantity, p.unit, p.price_per_unit, p.line_cost
    FROM public._parse_po_items_json(p_items) p
    ORDER BY p.ord
  LOOP
    IF v_line.item_id IS NOT NULL THEN
      UPDATE item_ingredients ii
      SET name           = v_line.name,
          quantity       = v_line.quantity,
          unit           = v_line.unit,
          price_per_unit = v_line.price_per_unit,
          cost           = v_line.line_cost,
          purchase_date  = p_purchase_date,
          buyer_name     = TRIM(p_buyer_name)
      WHERE ii.id = v_line.item_id AND ii.purchase_order_id = v_order_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'item_not_found:%', v_line.item_id;
      END IF;
    ELSE
      INSERT INTO item_ingredients (
        purchase_order_id, name, quantity, unit, price_per_unit, cost,
        purchase_date, buyer_name
      )
      VALUES (
        v_order_id, v_line.name, v_line.quantity, v_line.unit,
        v_line.price_per_unit, v_line.line_cost,
        p_purchase_date, TRIM(p_buyer_name)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total_cost', v_total,
    'item_count', jsonb_array_length(p_items)
  );
END;
$fn$;

COMMENT ON FUNCTION public.upsert_purchase_order(BIGINT, DATE, VARCHAR, TEXT, JSONB) IS
  'สร้าง/แก้ PO + รายการวัตถุดิบใน transaction เดียว (L6)';

-- -------------------------------------------------------------
-- L7 — ปรับแต้มสมาชิก atomic + FOR UPDATE
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_loyalty_points(
  p_phone_number VARCHAR(10),
  p_adjustment   INT,
  p_reason       TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_old    INT;
  v_new    INT;
  v_actual INT;
  v_reason TEXT;
  v_actor  TEXT;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_reason := NULLIF(TRIM(p_reason), '');
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'invalid_reason';
  END IF;

  IF p_adjustment = 0 THEN
    RAISE EXCEPTION 'invalid_adjustment';
  END IF;

  SELECT lm.points INTO v_old
  FROM loyalty_members lm
  WHERE lm.phone_number = p_phone_number
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  v_new := GREATEST(0, v_old + p_adjustment);
  v_actual := v_new - v_old;
  v_actor := COALESCE(public.jwt_emp_name(), 'owner');

  UPDATE loyalty_members
  SET points = v_new
  WHERE phone_number = p_phone_number;

  INSERT INTO points_logs (phone_number, adjustment, reason, adjusted_by)
  VALUES (p_phone_number, v_actual, v_reason, v_actor);

  RETURN jsonb_build_object(
    'phone_number', p_phone_number,
    'points', v_new,
    'adjustment', v_actual
  );
END;
$fn$;

COMMENT ON FUNCTION public.adjust_loyalty_points(VARCHAR, INT, TEXT) IS
  'ปรับแต้มสมาชิกใน transaction เดียว — ล็อกแถว + audit จาก JWT (L7)';

-- -------------------------------------------------------------
-- สิทธิ์
-- -------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.upsert_purchase_order(BIGINT, DATE, VARCHAR, TEXT, JSONB),
  public.adjust_loyalty_points(VARCHAR, INT, TEXT)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.upsert_purchase_order(BIGINT, DATE, VARCHAR, TEXT, JSONB)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.adjust_loyalty_points(VARCHAR, INT, TEXT)
  TO authenticated, service_role;

COMMIT;
