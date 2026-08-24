-- =============================================================
-- A7.4 / A7.5 / A7.6 / A7.7 + หางของ A1 ที่เจอตอนตั้ง harness ทดสอบ
--
--   A1 (หาง) : authenticated ได้ GRANT ALL บนทุกตารางจาก default privileges ของ Supabase
--              → TRUNCATE ไม่ถูก RLS คุม = ล้างตาราง payments ทิ้งได้
--   A7.4     : ยังไม่มีอะไรกันบิล active ซ้ำต่อโต๊ะที่ระดับตาราง
--   A7.5     : void_order_item ตัดสินคืนสต็อกด้วยการ match ข้อความไทย
--   A7.6     : ชื่อผู้ทำรายการใน void_logs เป็น string ที่ client ส่งมาเอง = audit ปลอมได้
--   A7.7     : ลบโต๊ะ 1 แถว = ลบ orders → order_items + payments ทั้งหมดของโต๊ะนั้น
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. A1 (หาง) — ตัดสิทธิ์ที่ไม่ได้ตั้งใจให้ของ authenticated
--
--    Supabase ตั้ง ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon, authenticated
--    ไว้ตั้งแต่ตอนสร้างโปรเจกต์ → **ทุกตารางที่ migration สร้างขึ้นทีหลังได้ GRANT ALL อัตโนมัติ**
--    20260824 revoke ของ anon ไปแล้ว แต่ไม่เคย revoke ของ authenticated
--
--    ผลที่พิสูจน์แล้วด้วย psql (ล็อกอินเป็น authenticator แล้ว SET ROLE authenticated):
--      TRUNCATE payments CASCADE;   → สำเร็จ  ← RLS ไม่คุม TRUNCATE
--    (SELECT/UPDATE employees ยังโดน RLS กันอยู่เพราะไม่มี policy — แต่พึ่ง RLS ชั้นเดียวไม่พอ)
-- -------------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;

-- คืนเฉพาะที่ตั้งใจ (ชุดเดียวกับ 20260824 §8.3 — ไม่มี DELETE/TRUNCATE บนตารางการเงิน)
GRANT SELECT ON tables, orders, order_items, menu_items, promotions,
                qr_sessions, loyalty_members                       TO authenticated;
GRANT SELECT ON payments, payment_promotions, points_logs, void_logs,
                stock_logs, item_ingredients, purchase_orders      TO authenticated;
GRANT UPDATE          ON order_items                               TO authenticated;
GRANT INSERT          ON qr_sessions                               TO authenticated;
GRANT INSERT, UPDATE, DELETE ON loyalty_members                    TO authenticated;
GRANT INSERT, UPDATE, DELETE ON menu_items, promotions,
                                item_ingredients, purchase_orders  TO authenticated;
GRANT INSERT          ON points_logs                               TO authenticated;
GRANT USAGE, SELECT   ON ALL SEQUENCES IN SCHEMA public            TO authenticated;

-- -------------------------------------------------------------
-- 2. A7.7 — ลบโต๊ะต้องไม่ลบประวัติการเงิน
--    เดิม tables → orders → (order_items, payments) → payment_promotions เป็น CASCADE ทั้งสาย
-- -------------------------------------------------------------
ALTER TABLE orders   DROP CONSTRAINT IF EXISTS orders_table_id_fkey;
ALTER TABLE orders   ADD  CONSTRAINT orders_table_id_fkey
  FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE RESTRICT;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_order_id_fkey;
ALTER TABLE payments ADD  CONSTRAINT payments_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT orders_table_id_fkey ON orders IS
  'RESTRICT ไม่ใช่ CASCADE — โต๊ะที่มีประวัติออเดอร์ต้องลบไม่ได้ (A7.7)';

-- -------------------------------------------------------------
-- 3. A7.4 — หนึ่งโต๊ะมีบิล active ได้ใบเดียว บังคับที่ระดับตาราง
--    (20260826 เปลี่ยนไปล็อกแถว tables แล้ว index นี้คือชั้นที่สองที่โกงไม่ได้)
-- -------------------------------------------------------------
DO $do$
DECLARE v_dup TEXT;
BEGIN
  SELECT string_agg(t.table_id::TEXT, ', ') INTO v_dup
  FROM (SELECT o.table_id FROM orders o WHERE o.status = 'active'
        GROUP BY o.table_id HAVING COUNT(*) > 1) t;

  IF v_dup IS NOT NULL THEN
    RAISE EXCEPTION
      'มีโต๊ะที่เปิดบิล active ซ้ำอยู่แล้ว (table_id: %) '
      'ต้องรวมหรือปิดบิลส่วนเกินก่อน จึงจะสร้าง unique index ได้', v_dup;
  END IF;
END
$do$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_order_per_table
  ON orders(table_id) WHERE status = 'active';

-- -------------------------------------------------------------
-- 4. A7.6 — ตัวตนผู้ทำรายการต้องมาจาก JWT ไม่ใช่จาก body
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jwt_emp_id()
RETURNS INT
LANGUAGE sql STABLE
SET search_path = public
AS $fn$
  SELECT NULLIF(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'emp_id', ''
  )::INT;
$fn$;

CREATE OR REPLACE FUNCTION public.jwt_emp_name()
RETURNS TEXT
LANGUAGE sql STABLE
SET search_path = public
AS $fn$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'emp_name', ''
  );
$fn$;

-- ⚠️ ต้อง REVOKE เองทุกฟังก์ชันใหม่
--    บรรทัด `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`
--    ใน 20260824 **ไม่มีผลจริง** — พิสูจน์แล้วบน PG17: ไม่มีแถวใน pg_default_acl
--    และฟังก์ชันที่สร้างหลังจากนั้นยังได้ PUBLIC EXECUTE ทุกตัว
--    ⇒ กฎ "สร้าง RPC ใหม่ต้อง REVOKE" ไม่ใช่การทำเผื่อ แต่เป็นด่านเดียวที่มี
REVOKE EXECUTE ON FUNCTION public.jwt_emp_id(), public.jwt_emp_name()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jwt_emp_id(), public.jwt_emp_name()
  TO authenticated, service_role;

ALTER TABLE void_logs ADD COLUMN IF NOT EXISTS employee_id INT;
ALTER TABLE void_logs ADD COLUMN IF NOT EXISTS reason_code TEXT;

COMMENT ON COLUMN void_logs.employee_id IS
  'มาจาก claim emp_id ใน JWT เท่านั้น — client ปลอมไม่ได้ (A7.6)';
COMMENT ON COLUMN void_logs.employee_name IS
  'มาจาก claim emp_name ใน JWT เท่านั้น — เดิมเป็น string ที่ client ส่งมาเอง (A7.6)';

-- ผู้บันทึกใบสั่งซื้อวัตถุดิบ: buyer_name เป็นข้อมูลธุรกิจ (ใครเป็นคนไปซื้อ) แก้ได้ตามจริง
-- แต่ "ใครเป็นคนคีย์เข้าระบบ" ต้องมาจาก JWT และแก้ไม่ได้
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by_emp_id INT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(100);

CREATE OR REPLACE FUNCTION public.stamp_purchase_order_actor()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  NEW.created_by_emp_id := public.jwt_emp_id();
  NEW.created_by_name   := NULLIF(public.jwt_emp_name(), '');
  RETURN NEW;
END;
$fn$;

-- trigger function ก็ต้องปิดเหมือนกัน (เรียกตรงๆ ไม่ได้อยู่แล้ว แต่ไม่มีเหตุผลให้ anon เห็น)
REVOKE EXECUTE ON FUNCTION public.stamp_purchase_order_actor() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_stamp_purchase_order_actor ON purchase_orders;
CREATE TRIGGER trg_stamp_purchase_order_actor
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.stamp_purchase_order_actor();

-- -------------------------------------------------------------
-- 5. A7.5 — เลิกตัดสินคืนสต็อกด้วยการ match ข้อความไทย
--
--    ของเดิม: IF p_reason IN ('คีย์ผิด','คีย์ผิดพลาด','คีย์ออเดอร์ผิดพลาด') THEN คืนสต็อก
--             → เปลี่ยน label ใน UI หรือพิมพ์ผิด 1 ตัว = สต็อกเพี้ยนเงียบๆ
--             (และ POS กับครัวมีรายการเหตุผลไม่ตรงกันอยู่แล้ว — L15)
--
--    ของใหม่: รับ "รหัสเหตุผล" ที่ตายตัว · ข้อความไทยเป็นแค่ป้ายกำกับ
--             รหัสต้องตรงกับ lib/voidReasons.ts (แหล่งเดียวของฝั่งแอป)
--
--    ⚠️ เจตนาคงพฤติกรรมเดิมทุกประการ: มีเฉพาะ 'wrong_key' ที่คืนสต็อก
--       การเปลี่ยนว่าเหตุผลไหนควรคืนสต็อกเป็นการตัดสินใจของเจ้าของร้าน ไม่ใช่ผลข้างเคียงของงานนี้
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.void_order_item(INT, VARCHAR, VARCHAR, INT);

CREATE OR REPLACE FUNCTION public.void_order_item(
  p_order_item_id INT,
  p_reason_code   TEXT,
  p_reason_note   TEXT DEFAULT NULL,
  p_void_quantity INT  DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_menu_item_id  INT;
  v_quantity      INT;
  v_unit_price    DECIMAL(10, 2);
  v_menu_name     VARCHAR(100);
  v_order_id      INT;
  v_item_status   VARCHAR(20);
  v_table_id      INT;
  v_tracked       BOOLEAN;
  v_void_qty      INT;
  v_remaining     INT;
  v_restore       BOOLEAN;
  v_label         TEXT;
  v_reason        TEXT;
  v_note          TEXT := NULLIF(TRIM(COALESCE(p_reason_note, '')), '');
BEGIN
  -- 5.1 รหัสเหตุผล → ป้ายกำกับ + คืนสต็อกหรือไม่
  CASE p_reason_code
    WHEN 'wrong_key'        THEN v_label := 'คีย์ออเดอร์ผิด';      v_restore := TRUE;
    WHEN 'customer_changed' THEN v_label := 'ลูกค้าเปลี่ยนใจ';      v_restore := FALSE;
    WHEN 'cooking_error'    THEN v_label := 'ทำอาหารผิดพลาด';      v_restore := FALSE;
    WHEN 'too_slow'         THEN v_label := 'รอนานเกินไป';         v_restore := FALSE;
    WHEN 'out_of_stock'     THEN v_label := 'วัตถุดิบหมดกลางคัน';   v_restore := FALSE;
    WHEN 'other'            THEN v_label := 'อื่นๆ';               v_restore := FALSE;
    ELSE RETURN FALSE;   -- รหัสที่ไม่รู้จัก = ปฏิเสธ ไม่ใช่เดาแล้วทำต่อ
  END CASE;

  IF p_reason_code = 'other' AND v_note IS NULL THEN
    RETURN FALSE;        -- เลือก "อื่นๆ" ต้องระบุเหตุผล
  END IF;

  v_reason := LEFT(v_label || COALESCE(' — ' || v_note, ''), 255);

  -- 5.2 ล็อกรายการที่จะ void
  SELECT oi.menu_item_id, oi.quantity, oi.unit_price, oi.order_id, oi.status
  INTO v_menu_item_id, v_quantity, v_unit_price, v_order_id, v_item_status
  FROM order_items oi WHERE oi.id = p_order_item_id FOR UPDATE;

  IF v_menu_item_id IS NULL OR v_item_status = 'voided' THEN
    RETURN FALSE;
  END IF;

  IF p_void_quantity IS NULL OR p_void_quantity >= v_quantity THEN
    v_void_qty := v_quantity;
  ELSIF p_void_quantity < 1 THEN
    RETURN FALSE;
  ELSE
    v_void_qty := p_void_quantity;
  END IF;

  SELECT mi.name, COALESCE(mi.is_stock_tracked, TRUE)
  INTO v_menu_name, v_tracked
  FROM menu_items mi WHERE mi.id = v_menu_item_id;

  IF v_restore AND v_tracked THEN
    UPDATE menu_items SET stock = stock + v_void_qty WHERE id = v_menu_item_id;
  END IF;

  IF v_void_qty >= v_quantity THEN
    UPDATE order_items SET status = 'voided' WHERE id = p_order_item_id;
  ELSE
    UPDATE order_items SET quantity = quantity - v_void_qty WHERE id = p_order_item_id;
  END IF;

  -- 5.3 audit — ตัวตนมาจาก JWT ไม่ใช่จากผู้เรียก (A7.6)
  INSERT INTO void_logs (
    employee_id, employee_name, menu_name, quantity, total_amount,
    reason, reason_code, restored_stock
  ) VALUES (
    public.jwt_emp_id(),
    COALESCE(NULLIF(public.jwt_emp_name(), ''), 'ระบบ'),
    v_menu_name, v_void_qty, v_void_qty * v_unit_price,
    v_reason, p_reason_code, (v_restore AND v_tracked)
  );

  -- 5.4 ถ้าไม่เหลือรายการที่ยังไม่ถูก void แล้ว = ปิดบิลทิ้งและคืนโต๊ะ
  IF v_void_qty >= v_quantity THEN
    SELECT COUNT(*) INTO v_remaining
    FROM order_items oi WHERE oi.order_id = v_order_id AND oi.status <> 'voided';

    IF v_remaining = 0 THEN
      UPDATE orders SET status = 'voided' WHERE id = v_order_id
      RETURNING table_id INTO v_table_id;
      UPDATE tables SET status = 'vacant' WHERE id = v_table_id;
    END IF;
  END IF;

  RETURN TRUE;
END;
$fn$;

COMMENT ON FUNCTION public.void_order_item(INT, TEXT, TEXT, INT) IS
  'ยกเลิกรายการ — คืนสต็อกตามรหัสเหตุผล (A7.5) และบันทึกผู้ทำรายการจาก JWT (A7.6) '
  'รหัสเหตุผลต้องตรงกับ lib/voidReasons.ts';

REVOKE EXECUTE ON FUNCTION public.void_order_item(INT, TEXT, TEXT, INT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.void_order_item(INT, TEXT, TEXT, INT)
  TO authenticated, service_role;

COMMIT;
