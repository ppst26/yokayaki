-- =============================================================
-- Partial Void: อัปเดต void_order_item ให้รองรับการ Void บางส่วน
-- =============================================================
-- เพิ่ม parameter p_void_quantity เพื่อกำหนดจำนวนที่ต้องการ Void
-- - ถ้า p_void_quantity = quantity ทั้งหมด → Void ทั้งรายการ (status = 'voided')
-- - ถ้า p_void_quantity < quantity → ลดจำนวนลง (ไม่เปลี่ยน status) + บันทึก void_logs
-- =============================================================

CREATE OR REPLACE FUNCTION void_order_item(
  p_order_item_id INT,
  p_employee_name VARCHAR,
  p_reason VARCHAR,
  p_void_quantity INT DEFAULT NULL
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
  v_is_stock_tracked BOOLEAN;
  v_actual_void_qty INT;
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

  -- Determine actual void quantity (default = void all)
  IF p_void_quantity IS NULL OR p_void_quantity >= v_quantity THEN
    v_actual_void_qty := v_quantity;
  ELSIF p_void_quantity < 1 THEN
    RETURN FALSE; -- ห้าม Void 0 หรือค่าติดลบ
  ELSE
    v_actual_void_qty := p_void_quantity;
  END IF;

  -- Get menu item name and is_stock_tracked flag
  SELECT name, COALESCE(is_stock_tracked, TRUE)
  INTO v_menu_name, v_is_stock_tracked
  FROM menu_items WHERE id = v_menu_item_id;

  -- Determine if stock should be restored
  IF p_reason = 'คีย์ผิด' OR p_reason = 'คีย์ผิดพลาด' OR p_reason = 'คีย์ออเดอร์ผิดพลาด' THEN
    v_restore_stock := TRUE;
    -- Restore stock only for stock-tracked items
    IF v_is_stock_tracked THEN
      UPDATE menu_items SET stock = stock + v_actual_void_qty WHERE id = v_menu_item_id;
    END IF;
  ELSE
    v_restore_stock := FALSE;
  END IF;

  -- Partial void vs Full void
  IF v_actual_void_qty >= v_quantity THEN
    -- FULL VOID: เปลี่ยน status เป็น voided (เหมือนเดิม)
    UPDATE order_items SET status = 'voided' WHERE id = p_order_item_id;
  ELSE
    -- PARTIAL VOID: ลดจำนวนลง (ไม่เปลี่ยน status)
    UPDATE order_items SET quantity = quantity - v_actual_void_qty WHERE id = p_order_item_id;
  END IF;

  -- Insert void log (บันทึกจำนวนที่ Void จริง)
  INSERT INTO void_logs (employee_name, menu_name, quantity, total_amount, reason, restored_stock)
  VALUES (p_employee_name, v_menu_name, v_actual_void_qty, v_actual_void_qty * v_unit_price, p_reason, v_restore_stock);

  -- Check if all active items in this order are now voided (for full void case)
  IF v_actual_void_qty >= v_quantity THEN
    SELECT COUNT(*) INTO v_remaining_items FROM order_items WHERE order_id = v_order_id AND status != 'voided';
    IF v_remaining_items = 0 THEN
      UPDATE orders SET status = 'voided' WHERE id = v_order_id;
      SELECT table_id INTO v_table_id FROM orders WHERE id = v_order_id;
      UPDATE tables SET status = 'vacant' WHERE id = v_table_id;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
