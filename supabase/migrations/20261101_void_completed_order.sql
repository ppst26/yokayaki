BEGIN;

-- =============================================================
-- ยกเลิกบิลที่ปิดแล้ว (Void Completed Bill)
--
-- 1. payments: เพิ่มคอลัมน์ is_voided และ voided_at เพื่อการจัดทำรายงานบัญชี
-- 2. void_logs: เพิ่ม order_id สำหรับ audit trail
-- 3. void_completed_order RPC: ทำงานแบบ atomic ใน transaction เดียว
--    - สิทธิ์: owner หรือ manager หรือ service_role
--    - คืนสต็อก menu_items + บันทึก stock_logs
--    - ดึงแต้ม loyalty_members คืน + บันทึก points_logs
--    - ปรับสถานะ orders.status = 'voided', order_items.status = 'voided', payments.is_voided = TRUE
--    - บันทึก void_logs พร้อม reason_code และ employee_id จาก JWT
-- =============================================================

-- 1. payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_voided BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- 2. void_logs
ALTER TABLE public.void_logs ADD COLUMN IF NOT EXISTS order_id INT REFERENCES public.orders(id) ON DELETE SET NULL;

-- 3. RPC void_completed_order
CREATE OR REPLACE FUNCTION public.void_completed_order(
  p_order_id     INT,
  p_reason_code  TEXT,
  p_reason_note  TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org           UUID := public.jwt_org_id();
  v_actor_id      INT := public.jwt_emp_id();
  v_actor_name    TEXT := public.jwt_emp_name();
  v_order_status  VARCHAR(20);
  v_table_id      UUID;
  v_payment_id    INT;
  v_net           DECIMAL(10, 2);
  v_pts_earned    INT;
  v_pts_redeemed  INT;
  v_phone         VARCHAR(10);
  v_member_points INT;
  v_new_points    INT;
  v_label         TEXT;
  v_reason        TEXT;
  v_item          RECORD;
  v_item_count    INT := 0;
  v_total_qty     INT := 0;
  v_old_stock     INT;
  v_new_stock     INT;
  v_note          TEXT := NULLIF(TRIM(COALESCE(p_reason_note, '')), '');
BEGIN
  -- 3.1 สิทธิ์: ต้องเป็น owner หรือ manager หรือ service_role
  IF NOT (
    COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') = 'service_role'
    OR current_user = 'service_role'
    OR public.jwt_emp_role() IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- 3.2 ตรวจสอบรหัสเหตุผล
  CASE p_reason_code
    WHEN 'wrong_bill'       THEN v_label := 'คีย์ผิด / คิดเงินผิดโต๊ะ';
    WHEN 'wrong_key'        THEN v_label := 'คีย์ออเดอร์ผิด';
    WHEN 'customer_cancel'  THEN v_label := 'ลูกค้ายกเลิก / ขอคืนเงิน';
    WHEN 'customer_changed' THEN v_label := 'ลูกค้าเปลี่ยนใจ';
    WHEN 'cooking_error'    THEN v_label := 'อาหารมีปัญหา / ทำผิดพลาด';
    WHEN 'too_slow'         THEN v_label := 'รอนานเกินไป';
    WHEN 'out_of_stock'     THEN v_label := 'วัตถุดิบหมดกลางคัน';
    WHEN 'other'            THEN v_label := 'อื่นๆ';
    ELSE RAISE EXCEPTION 'invalid_reason_code';
  END CASE;

  IF p_reason_code = 'other' AND v_note IS NULL THEN
    RAISE EXCEPTION 'reason_note_required';
  END IF;

  v_reason := LEFT(v_label || COALESCE(' — ' || v_note, ''), 255);

  -- 3.3 ตรวจสอบและล็อกออเดอร์
  SELECT o.status, o.table_id
  INTO v_order_status, v_table_id
  FROM orders o
  WHERE o.id = p_order_id AND (v_org IS NULL OR o.org_id = v_org)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order_status != 'completed' THEN
    RAISE EXCEPTION 'order_not_completed';
  END IF;

  -- 3.4 ดึงข้อมูล payment
  SELECT p.id, p.net_amount, p.points_earned, p.points_redeemed, p.phone_number
  INTO v_payment_id, v_net, v_pts_earned, v_pts_redeemed, v_phone
  FROM payments p
  WHERE p.order_id = p_order_id AND (v_org IS NULL OR p.org_id = v_org)
  FOR UPDATE;

  -- 3.5 ดึงแต้มสมาชิกคืน
  IF v_phone IS NOT NULL THEN
    SELECT lm.points
    INTO v_member_points
    FROM loyalty_members lm
    WHERE lm.phone_number = v_phone AND (v_org IS NULL OR lm.org_id = v_org)
    FOR UPDATE;

    IF FOUND THEN
      v_new_points := GREATEST(0, COALESCE(v_member_points, 0) - COALESCE(v_pts_earned, 0) + COALESCE(v_pts_redeemed, 0));

      UPDATE loyalty_members
      SET points = v_new_points
      WHERE phone_number = v_phone AND (v_org IS NULL OR org_id = v_org);

      INSERT INTO points_logs (
        phone_number,
        adjustment,
        reason,
        adjusted_by,
        org_id
      ) VALUES (
        v_phone,
        (COALESCE(v_pts_redeemed, 0) - COALESCE(v_pts_earned, 0)),
        LEFT('ยกเลิกบิล ORD-' || p_order_id || ': ' || v_reason, 255),
        COALESCE(v_actor_name, 'ระบบ'),
        v_org
      );
    END IF;
  END IF;

  -- 3.6 คืนสต็อกวัตถุดิบ & อัปเดต order_items
  FOR v_item IN
    SELECT oi.id, oi.menu_item_id, oi.quantity, mi.name AS menu_name, COALESCE(mi.is_stock_tracked, TRUE) AS is_tracked, mi.stock AS current_stock
    FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    WHERE oi.order_id = p_order_id AND oi.status != 'voided' AND (v_org IS NULL OR oi.org_id = v_org)
    FOR UPDATE OF mi
  LOOP
    v_item_count := v_item_count + 1;
    v_total_qty  := v_total_qty + v_item.quantity;

    IF v_item.is_tracked THEN
      v_old_stock := v_item.current_stock;
      v_new_stock := v_old_stock + v_item.quantity;

      UPDATE menu_items
      SET stock = v_new_stock
      WHERE id = v_item.menu_item_id;

      INSERT INTO stock_logs (
        menu_item_id,
        menu_item_name,
        employee_name,
        old_stock,
        new_stock,
        change_amount,
        org_id
      ) VALUES (
        v_item.menu_item_id,
        v_item.menu_name,
        COALESCE(v_actor_name, 'ระบบ'),
        v_old_stock,
        v_new_stock,
        v_item.quantity,
        v_org
      );
    END IF;

    UPDATE order_items
    SET status = 'voided'
    WHERE id = v_item.id;
  END LOOP;

  -- 3.7 อัปเดตสถานะ orders & payments
  UPDATE orders
  SET status = 'voided'
  WHERE id = p_order_id;

  IF v_payment_id IS NOT NULL THEN
    UPDATE payments
    SET is_voided = TRUE,
        voided_at = NOW()
    WHERE id = v_payment_id;
  END IF;

  -- 3.8 บันทึก void_logs
  INSERT INTO void_logs (
    order_id,
    employee_id,
    employee_name,
    menu_name,
    quantity,
    total_amount,
    reason,
    reason_code,
    restored_stock,
    org_id
  ) VALUES (
    p_order_id,
    v_actor_id,
    COALESCE(v_actor_name, 'ระบบ'),
    'ยกเลิกบิล #' || p_order_id,
    v_total_qty,
    COALESCE(v_net, 0),
    v_reason,
    p_reason_code,
    TRUE,
    v_org
  );

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'total_amount', COALESCE(v_net, 0),
    'restored_items_count', v_item_count,
    'restored_units', v_total_qty,
    'points_reversed', (COALESCE(v_pts_earned, 0) - COALESCE(v_pts_redeemed, 0))
  );
END;
$fn$;

COMMENT ON FUNCTION public.void_completed_order(INT, TEXT, TEXT) IS
  'ยกเลิกบิลที่ปิดแล้ว (Void Bill) — คืนสต็อก ดึงแต้มสมาชิกคืน ปรับ orders.status=voided และบันทึก void_logs + points_logs + stock_logs ในทรานแซกชันเดียว';

REVOKE EXECUTE ON FUNCTION public.void_completed_order(INT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.void_completed_order(INT, TEXT, TEXT) TO authenticated, service_role;

COMMIT;
