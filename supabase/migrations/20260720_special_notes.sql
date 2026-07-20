-- Add notes column to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes VARCHAR(255) DEFAULT NULL;

-- Update place_order_item function to support notes
CREATE OR REPLACE FUNCTION place_order_item(
  p_table_id INT,
  p_menu_item_id INT,
  p_quantity INT,
  p_unit_price DECIMAL(10, 2),
  p_notes VARCHAR(255) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_order_id INT;
  v_current_stock INT;
  v_is_stock_tracked BOOLEAN;
BEGIN
  -- Get current stock and tracking info
  SELECT stock, is_stock_tracked INTO v_current_stock, v_is_stock_tracked 
  FROM menu_items WHERE id = p_menu_item_id FOR UPDATE;
  
  -- Check stock if tracked
  IF v_is_stock_tracked AND v_current_stock < p_quantity THEN
    RETURN FALSE;
  END IF;

  -- Get or create active order for the table
  SELECT id INTO v_order_id FROM orders WHERE table_id = p_table_id AND status = 'active' LIMIT 1;
  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, status) VALUES (p_table_id, 'active') RETURNING id INTO v_order_id;
    -- Set table status to occupied
    UPDATE tables SET status = 'occupied' WHERE id = p_table_id;
  END IF;

  -- Insert order item with notes
  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes)
  VALUES (v_order_id, p_menu_item_id, p_quantity, p_unit_price, p_notes);

  -- Deduct stock if tracked
  IF v_is_stock_tracked THEN
    UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update customer_place_order_item function to support notes
CREATE OR REPLACE FUNCTION customer_place_order_item(
  p_session_id UUID,
  p_menu_item_id INT,
  p_quantity INT,
  p_unit_price DECIMAL(10, 2),
  p_notes VARCHAR(255) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_table_id INT;
  v_session_status VARCHAR(20);
  v_expired_at TIMESTAMP WITH TIME ZONE;
  v_order_id INT;
  v_current_stock INT;
  v_is_stock_tracked BOOLEAN;
BEGIN
  -- Check QR Session
  SELECT table_id, status, expired_at INTO v_table_id, v_session_status, v_expired_at
  FROM qr_sessions WHERE id = p_session_id;

  IF v_table_id IS NULL THEN RETURN FALSE; END IF;
  IF v_session_status != 'active' THEN RETURN FALSE; END IF;
  IF v_expired_at IS NOT NULL AND v_expired_at < NOW() THEN 
    UPDATE qr_sessions SET status = 'expired' WHERE id = p_session_id;
    RETURN FALSE; 
  END IF;

  -- Get current stock and tracking info
  SELECT stock, is_stock_tracked INTO v_current_stock, v_is_stock_tracked 
  FROM menu_items WHERE id = p_menu_item_id FOR UPDATE;

  -- Check stock if tracked
  IF v_is_stock_tracked AND v_current_stock < p_quantity THEN RETURN FALSE; END IF;

  -- Get or create active order for the table
  SELECT id INTO v_order_id FROM orders WHERE table_id = v_table_id AND status = 'active' LIMIT 1;
  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, qr_session_id, status) VALUES (v_table_id, p_session_id, 'active') RETURNING id INTO v_order_id;
    UPDATE tables SET status = 'occupied' WHERE id = v_table_id;
  END IF;

  -- Insert order item with notes
  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes)
  VALUES (v_order_id, p_menu_item_id, p_quantity, p_unit_price, p_notes);

  -- Deduct stock if tracked
  IF v_is_stock_tracked THEN
    UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
