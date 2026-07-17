-- Create void_order_item Postgres function
CREATE OR REPLACE FUNCTION void_order_item(
  p_order_item_id INT,
  p_employee_name VARCHAR,
  p_reason VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_menu_item_id INT;
  v_quantity INT;
  v_unit_price DECIMAL(10, 2);
  v_menu_name VARCHAR(100);
  v_restore_stock BOOLEAN;
  v_order_id INT;
  v_item_status VARCHAR(20);
  v_remaining_items INT;
  v_table_id INT;
BEGIN
  -- Get order item details
  SELECT menu_item_id, quantity, unit_price, order_id, status
  INTO v_menu_item_id, v_quantity, v_unit_price, v_order_id, v_item_status
  FROM order_items WHERE id = p_order_item_id FOR UPDATE;

  -- Verify order item exists
  IF v_menu_item_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- If the item is already voided, do nothing
  IF v_item_status = 'voided' THEN
    RETURN FALSE;
  END IF;

  -- Get menu item name
  SELECT name INTO v_menu_name FROM menu_items WHERE id = v_menu_item_id;

  -- Determine if stock should be restored (reason is 'คีย์ผิด' or 'คีย์ผิดพลาด' or 'คีย์ออเดอร์ผิดพลาด')
  IF p_reason = 'คีย์ผิด' OR p_reason = 'คีย์ผิดพลาด' OR p_reason = 'คีย์ออเดอร์ผิดพลาด' THEN
    v_restore_stock := TRUE;
    -- Restore stock
    UPDATE menu_items SET stock = stock + v_quantity WHERE id = v_menu_item_id;
  ELSE
    v_restore_stock := FALSE;
  END IF;

  -- Update order item status to voided
  UPDATE order_items SET status = 'voided' WHERE id = p_order_item_id;

  -- Insert void log
  INSERT INTO void_logs (employee_name, menu_name, quantity, total_amount, reason, restored_stock)
  VALUES (p_employee_name, v_menu_name, v_quantity, v_quantity * v_unit_price, p_reason, v_restore_stock);

  -- Check if all active items in this order are now voided.
  -- If all items in this order are voided, we can mark the order status as voided and the table status as vacant.
  SELECT COUNT(*) INTO v_remaining_items FROM order_items WHERE order_id = v_order_id AND status != 'voided';
  IF v_remaining_items = 0 THEN
    -- Mark order as voided
    UPDATE orders SET status = 'voided' WHERE id = v_order_id;
    -- Set table status back to vacant
    SELECT table_id INTO v_table_id FROM orders WHERE id = v_order_id;
    UPDATE tables SET status = 'vacant' WHERE id = v_table_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 11. Enable Row Level Security (RLS) & Add Policies for client access
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access to orders" ON orders;
CREATE POLICY "Allow public read/write access to orders" ON orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access to order_items" ON order_items;
CREATE POLICY "Allow public read/write access to order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE void_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to void_logs" ON void_logs;
CREATE POLICY "Allow public read access to void_logs" ON void_logs FOR SELECT USING (true);
