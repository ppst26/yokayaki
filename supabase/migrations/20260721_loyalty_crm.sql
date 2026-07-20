-- =============================================
-- Migration: Loyalty CRM (Phase 10)
-- ตาราง points_logs + เพิ่ม phone_number ใน payments
-- อัปเดต complete_checkout RPC ให้บันทึก phone_number
-- =============================================

-- 1. สร้างตาราง points_logs (ประวัติปรับแต้มด้วยมือ)
CREATE TABLE IF NOT EXISTS points_logs (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(10) NOT NULL REFERENCES loyalty_members(phone_number) ON DELETE CASCADE,
  adjustment INT NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. เพิ่มคอลัมน์ phone_number ในตาราง payments (เพื่อ query ประวัติบิลย้อนหลัง)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS phone_number VARCHAR(10) DEFAULT NULL;

-- 3. เปิด RLS + Policies สำหรับ points_logs
ALTER TABLE points_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all points_logs for anon" ON points_logs;
CREATE POLICY "Allow all points_logs for anon" ON points_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all points_logs for service_role" ON points_logs;
CREATE POLICY "Allow all points_logs for service_role" ON points_logs
  FOR ALL TO service_role USING (true);

-- 4. อัปเดต complete_checkout RPC — บันทึก phone_number ลง payments ด้วย
CREATE OR REPLACE FUNCTION complete_checkout(
  p_order_id INT,
  p_payment_method VARCHAR,
  p_subtotal DECIMAL(10, 2),
  p_discount_amount DECIMAL(10, 2),
  p_net_amount DECIMAL(10, 2),
  p_points_earned INT,
  p_points_redeemed INT,
  p_phone_number VARCHAR DEFAULT NULL,
  p_applied_promos JSONB DEFAULT '[]'
) RETURNS BOOLEAN AS $$
DECLARE
  v_table_id INT;
  v_payment_id INT;
  v_promo JSONB;
BEGIN
  -- Get the table_id from the order
  SELECT table_id INTO v_table_id FROM orders WHERE id = p_order_id;
  IF v_table_id IS NULL THEN RETURN FALSE; END IF;

  -- Insert payment record (now includes phone_number)
  INSERT INTO payments (order_id, payment_method, subtotal, discount_amount, net_amount, points_earned, points_redeemed, phone_number)
  VALUES (p_order_id, p_payment_method, p_subtotal, p_discount_amount, p_net_amount, p_points_earned, p_points_redeemed, p_phone_number)
  RETURNING id INTO v_payment_id;

  -- Insert applied promotions (if any)
  IF p_applied_promos IS NOT NULL AND jsonb_array_length(p_applied_promos) > 0 THEN
    FOR v_promo IN SELECT * FROM jsonb_array_elements(p_applied_promos)
    LOOP
      INSERT INTO payment_promotions (payment_id, promotion_id, promotion_name, promotion_type, discount_value, free_items)
      VALUES (
        v_payment_id,
        (v_promo->>'promotion_id')::INT,
        v_promo->>'promotion_name',
        v_promo->>'promotion_type',
        (v_promo->>'discount_value')::DECIMAL(10,2),
        v_promo->'free_items'
      );
    END LOOP;
  END IF;

  -- Mark order as completed
  UPDATE orders SET status = 'completed' WHERE id = p_order_id;

  -- Mark all pending order items as served
  UPDATE order_items SET status = 'served' WHERE order_id = p_order_id AND status = 'pending';

  -- Set table back to vacant
  UPDATE tables SET status = 'vacant' WHERE id = v_table_id;

  -- Expire all active QR sessions for this table
  UPDATE qr_sessions SET status = 'expired', expired_at = NOW()
  WHERE table_id = v_table_id AND status = 'active';

  -- Update loyalty member points if phone number provided
  IF p_phone_number IS NOT NULL AND p_phone_number != '' THEN
    UPDATE loyalty_members
    SET points = points + p_points_earned - p_points_redeemed
    WHERE phone_number = p_phone_number;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
