-- 1. Enable RLS and add policies for qr_sessions
ALTER TABLE qr_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access to qr_sessions" ON qr_sessions;
CREATE POLICY "Allow public read/write access to qr_sessions" ON qr_sessions FOR ALL USING (true) WITH CHECK (true);

-- 2. Create customer_place_order_item Postgres function
CREATE OR REPLACE FUNCTION customer_place_order_item(
  p_session_id UUID,
  p_menu_item_id INT,
  p_quantity INT,
  p_unit_price DECIMAL(10, 2)
) RETURNS BOOLEAN AS $$
DECLARE
  v_table_id INT;
  v_session_status VARCHAR(20);
  v_expired_at TIMESTAMP WITH TIME ZONE;
  v_order_id INT;
  v_current_stock INT;
BEGIN
  -- Verify session is valid and active
  SELECT table_id, status, expired_at INTO v_table_id, v_session_status, v_expired_at
  FROM qr_sessions WHERE id = p_session_id;

  IF v_table_id IS NULL THEN RETURN FALSE; END IF;
  IF v_session_status != 'active' THEN RETURN FALSE; END IF;
  IF v_expired_at IS NOT NULL AND v_expired_at < NOW() THEN 
    -- Auto expire the session if time has passed
    UPDATE qr_sessions SET status = 'expired' WHERE id = p_session_id;
    RETURN FALSE; 
  END IF;

  -- Verify stock
  SELECT stock INTO v_current_stock FROM menu_items WHERE id = p_menu_item_id FOR UPDATE;
  IF v_current_stock < p_quantity THEN RETURN FALSE; END IF;

  -- Get active order for the table
  SELECT id INTO v_order_id FROM orders WHERE table_id = v_table_id AND status = 'active' LIMIT 1;
  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, qr_session_id, status) VALUES (v_table_id, p_session_id, 'active') RETURNING id INTO v_order_id;
    UPDATE tables SET status = 'occupied' WHERE id = v_table_id;
  END IF;

  -- Insert order item
  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price)
  VALUES (v_order_id, p_menu_item_id, p_quantity, p_unit_price);

  -- Deduct stock
  UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
