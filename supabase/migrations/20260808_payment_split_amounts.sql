-- Migration: เพิ่ม cash_amount และ promptpay_amount ในตาราง payments
-- เพื่อเก็บยอดแยกสำหรับการชำระแบบผสม (เงินสด + QR)

-- 1. เพิ่มคอลัมน์ใหม่
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS cash_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promptpay_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- 2. Back-fill ข้อมูลเก่าตาม payment_method
UPDATE payments SET cash_amount = net_amount, promptpay_amount = 0 WHERE payment_method = 'cash';
UPDATE payments SET promptpay_amount = net_amount, cash_amount = 0 WHERE payment_method = 'promptpay';
-- mixed: ไม่รู้แบ่งยังไง ปล่อย 0 ทั้งคู่ (historical data ไม่มีข้อมูลแยก)

-- 3. อัปเดต complete_checkout RPC ให้รับ p_cash_amount และ p_promptpay_amount
CREATE OR REPLACE FUNCTION complete_checkout(
  p_order_id INT,
  p_payment_method VARCHAR,
  p_subtotal DECIMAL(10, 2),
  p_discount_amount DECIMAL(10, 2),
  p_net_amount DECIMAL(10, 2),
  p_points_earned INT,
  p_points_redeemed INT,
  p_phone_number VARCHAR DEFAULT NULL,
  p_applied_promos JSONB DEFAULT '[]',
  p_cash_amount DECIMAL(10, 2) DEFAULT 0,
  p_promptpay_amount DECIMAL(10, 2) DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
  v_table_id INT;
  v_payment_id INT;
  v_promo JSONB;
BEGIN
  SELECT table_id INTO v_table_id FROM orders WHERE id = p_order_id;
  IF v_table_id IS NULL THEN RETURN FALSE; END IF;

  INSERT INTO payments (
    order_id, payment_method, subtotal, discount_amount, net_amount,
    points_earned, points_redeemed, cash_amount, promptpay_amount
  )
  VALUES (
    p_order_id, p_payment_method, p_subtotal, p_discount_amount, p_net_amount,
    p_points_earned, p_points_redeemed, p_cash_amount, p_promptpay_amount
  )
  RETURNING id INTO v_payment_id;

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

  UPDATE orders SET status = 'completed' WHERE id = p_order_id;
  UPDATE order_items SET status = 'served' WHERE order_id = p_order_id AND status = 'pending';
  UPDATE tables SET status = 'vacant' WHERE id = v_table_id;
  UPDATE qr_sessions SET status = 'expired', expired_at = NOW()
  WHERE table_id = v_table_id AND status = 'active';

  IF p_phone_number IS NOT NULL AND p_phone_number != '' THEN
    UPDATE loyalty_members
    SET points = points + p_points_earned - p_points_redeemed
    WHERE phone_number = p_phone_number;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
