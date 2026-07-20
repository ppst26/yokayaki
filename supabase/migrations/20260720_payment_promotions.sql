-- =============================================
-- Migration: Payment Promotions (Sales History)
-- บันทึกว่าบิลไหนใช้โปรโมชั่นตัวไหน
-- =============================================

-- 1. สร้างตาราง payment_promotions
CREATE TABLE IF NOT EXISTS payment_promotions (
  id BIGSERIAL PRIMARY KEY,
  payment_id INT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  promotion_id INT NOT NULL REFERENCES promotions(id) ON DELETE SET NULL,
  promotion_name VARCHAR(100) NOT NULL,
  promotion_type VARCHAR(20) NOT NULL CHECK (promotion_type IN ('percentage', 'fixed', 'buy_x_get_y')),
  discount_value DECIMAL(10,2) NOT NULL,
  free_items JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. เปิด RLS + สร้าง policies
ALTER TABLE payment_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select payment_promotions for anon" ON payment_promotions;
CREATE POLICY "Allow select payment_promotions for anon" ON payment_promotions
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow insert payment_promotions for anon" ON payment_promotions;
CREATE POLICY "Allow insert payment_promotions for anon" ON payment_promotions
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all payment_promotions for service_role" ON payment_promotions;
CREATE POLICY "Allow all payment_promotions for service_role" ON payment_promotions
  FOR ALL TO service_role USING (true);

-- 3. อัปเดต complete_checkout RPC เพิ่มพารามิเตอร์ p_applied_promos
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

  -- Insert payment record and capture the new payment_id
  INSERT INTO payments (order_id, payment_method, subtotal, discount_amount, net_amount, points_earned, points_redeemed)
  VALUES (p_order_id, p_payment_method, p_subtotal, p_discount_amount, p_net_amount, p_points_earned, p_points_redeemed)
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
