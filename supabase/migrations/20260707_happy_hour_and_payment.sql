-- 1. Update menu items with Happy Hour prices
UPDATE menu_items SET is_happy_hour = true, happy_hour_price = 80.00 WHERE name = 'เบียร์สดโอกินาว่า';
UPDATE menu_items SET is_happy_hour = true, happy_hour_price = 50.00 WHERE name = 'ยากิโทริสะโพกไก่ (4 ไม้)';

-- 2. Enable RLS and policies for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access to payments" ON payments;
CREATE POLICY "Allow public read/write access to payments" ON payments FOR ALL USING (true) WITH CHECK (true);

-- 3. Enable RLS and policies for loyalty_members
ALTER TABLE loyalty_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access to loyalty_members" ON loyalty_members;
CREATE POLICY "Allow public read/write access to loyalty_members" ON loyalty_members FOR ALL USING (true) WITH CHECK (true);

-- 4. Create complete_checkout RPC function
CREATE OR REPLACE FUNCTION complete_checkout(
  p_order_id INT,
  p_payment_method VARCHAR,
  p_subtotal DECIMAL(10, 2),
  p_discount_amount DECIMAL(10, 2),
  p_net_amount DECIMAL(10, 2),
  p_points_earned INT,
  p_points_redeemed INT,
  p_phone_number VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_table_id INT;
BEGIN
  -- Get the table_id from the order
  SELECT table_id INTO v_table_id FROM orders WHERE id = p_order_id;
  IF v_table_id IS NULL THEN RETURN FALSE; END IF;

  -- Insert payment record
  INSERT INTO payments (order_id, payment_method, subtotal, discount_amount, net_amount, points_earned, points_redeemed)
  VALUES (p_order_id, p_payment_method, p_subtotal, p_discount_amount, p_net_amount, p_points_earned, p_points_redeemed);

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
