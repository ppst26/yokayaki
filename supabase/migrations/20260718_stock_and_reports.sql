-- 1. เพิ่มคอลัมน์ is_stock_tracked ในตาราง menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_stock_tracked BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. ตั้งค่าข้าวสวยญี่ปุ่นไม่นับสต็อกเป็นตัวอย่างเริ่มต้น
UPDATE menu_items SET is_stock_tracked = FALSE WHERE name = 'ข้าวสวยญี่ปุ่น';

-- 3. เพิ่มนโยบาย UPDATE สำหรับตาราง menu_items ให้เครื่อง POS ปรับแก้สต็อกได้
DROP POLICY IF EXISTS "Allow public update access to menu_items" ON menu_items;
CREATE POLICY "Allow public update access to menu_items" ON menu_items FOR UPDATE USING (true) WITH CHECK (true);

-- 4. อัปเดตฟังก์ชัน place_order_item ให้รองรับระบบตรวจสอบความต้องการนับสต็อก
CREATE OR REPLACE FUNCTION place_order_item(
  p_table_id INT,
  p_menu_item_id INT,
  p_quantity INT,
  p_unit_price DECIMAL(10, 2)
) RETURNS BOOLEAN AS $$
DECLARE
  v_order_id INT;
  v_current_stock INT;
  v_is_stock_tracked BOOLEAN;
BEGIN
  -- ดึงข้อมูลสต็อกปัจจุบันและสถานะการนับสต็อก
  SELECT stock, is_stock_tracked INTO v_current_stock, v_is_stock_tracked 
  FROM menu_items WHERE id = p_menu_item_id FOR UPDATE;
  
  -- ตรวจเช็คสต็อกเฉพาะเมนูที่เลือกนับสต็อกเท่านั้น
  IF v_is_stock_tracked AND v_current_stock < p_quantity THEN
    RETURN FALSE;
  END IF;

  -- ค้นหาหรือสร้างออเดอร์ใหม่ประจำโต๊ะที่เปิดอยู่
  SELECT id INTO v_order_id FROM orders WHERE table_id = p_table_id AND status = 'active' LIMIT 1;
  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, status) VALUES (p_table_id, 'active') RETURNING id INTO v_order_id;
    -- เปลี่ยนสถานะโต๊ะเป็นมีลูกค้า (occupied)
    UPDATE tables SET status = 'occupied' WHERE id = p_table_id;
  END IF;

  -- เพิ่มรายการอาหารในออเดอร์
  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price)
  VALUES (v_order_id, p_menu_item_id, p_quantity, p_unit_price);

  -- หักสต็อกเฉพาะรายการอาหารที่เลือกนับสต็อก
  IF v_is_stock_tracked THEN
    UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. อัปเดตฟังก์ชัน customer_place_order_item (ของลูกค้าสั่ง) ให้รองรับระบบเปิด/ปิดสต็อก
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
  v_is_stock_tracked BOOLEAN;
BEGIN
  -- ตรวจสอบความถูกต้องของ QR Session
  SELECT table_id, status, expired_at INTO v_table_id, v_session_status, v_expired_at
  FROM qr_sessions WHERE id = p_session_id;

  IF v_table_id IS NULL THEN RETURN FALSE; END IF;
  IF v_session_status != 'active' THEN RETURN FALSE; END IF;
  IF v_expired_at IS NOT NULL AND v_expired_at < NOW() THEN 
    -- เปลี่ยนสถานะ QR Session เป็นหมดอายุเมื่อพ้นกำหนด 2 ชั่วโมง
    UPDATE qr_sessions SET status = 'expired' WHERE id = p_session_id;
    RETURN FALSE; 
  END IF;

  -- ดึงข้อมูลสต็อกปัจจุบันและสถานะการนับสต็อก
  SELECT stock, is_stock_tracked INTO v_current_stock, v_is_stock_tracked 
  FROM menu_items WHERE id = p_menu_item_id FOR UPDATE;

  -- ตรวจเช็คสต็อกเฉพาะเมนูที่เลือกนับสต็อกเท่านั้น
  IF v_is_stock_tracked AND v_current_stock < p_quantity THEN RETURN FALSE; END IF;

  -- ค้นหาหรือสร้างออเดอร์ใหม่ประจำโต๊ะ
  SELECT id INTO v_order_id FROM orders WHERE table_id = v_table_id AND status = 'active' LIMIT 1;
  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, qr_session_id, status) VALUES (v_table_id, p_session_id, 'active') RETURNING id INTO v_order_id;
    UPDATE tables SET status = 'occupied' WHERE id = v_table_id;
  END IF;

  -- เพิ่มรายการอาหารในออเดอร์
  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price)
  VALUES (v_order_id, p_menu_item_id, p_quantity, p_unit_price);

  -- หักสต็อกเฉพาะรายการอาหารที่เลือกนับสต็อก
  IF v_is_stock_tracked THEN
    UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
