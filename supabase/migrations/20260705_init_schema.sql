-- 1. Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL, -- SHA-256 hash representation of 6-digit PIN
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create tables table
CREATE TABLE IF NOT EXISTS tables (
  id INT PRIMARY KEY, -- Table number 1, 2, 3, 4
  status VARCHAR(20) NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'checking_out')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create qr_sessions table
CREATE TABLE IF NOT EXISTS qr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id INT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expired_at TIMESTAMP WITH TIME ZONE
);

-- 4. Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  is_happy_hour BOOLEAN NOT NULL DEFAULT FALSE,
  happy_hour_price DECIMAL(10, 2) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  table_id INT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  qr_session_id UUID REFERENCES qr_sessions(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'voided')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_applied DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'served', 'voided')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create void_logs table
CREATE TABLE IF NOT EXISTS void_logs (
  id SERIAL PRIMARY KEY,
  employee_name VARCHAR(100) NOT NULL,
  menu_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  restored_stock BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create loyalty_members table
CREATE TABLE IF NOT EXISTS loyalty_members (
  phone_number VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'promptpay', 'mixed')),
  subtotal DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10, 2) NOT NULL,
  points_earned INT NOT NULL DEFAULT 0,
  points_redeemed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Seed Data
INSERT INTO employees (name, pin_hash, role) VALUES 
('Pee Pee (Owner)', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'owner'),
('Best (Staff)', '8d969ee76d243c53b6b3061467aa3b8d30c441408eb39af7194b14091118366d', 'staff')
ON CONFLICT DO NOTHING;

INSERT INTO tables (id, status) VALUES 
(1, 'vacant'),
(2, 'vacant'),
(3, 'vacant'),
(4, 'vacant')
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price) VALUES
('เบียร์สดโอกินาว่า', 120.00, 10, false, null),
('ยากิโทริสะโพกไก่ (4 ไม้)', 80.00, 3, false, null),
('แก้มปลาต้มซีอิ๊ว', 250.00, 0, false, null),
('ซาชิมิแซลมอน', 180.00, 15, false, null),
('ข้าวสวยญี่ปุ่น', 30.00, 999, false, null)
ON CONFLICT DO NOTHING;

-- Create SQL Function for Atomic Stock Deduction (place_order_item)
CREATE OR REPLACE FUNCTION place_order_item(
  p_table_id INT,
  p_menu_item_id INT,
  p_quantity INT,
  p_unit_price DECIMAL(10, 2)
) RETURNS BOOLEAN AS $$
DECLARE
  v_order_id INT;
  v_current_stock INT;
BEGIN
  -- Check stock
  SELECT stock INTO v_current_stock FROM menu_items WHERE id = p_menu_item_id FOR UPDATE;
  IF v_current_stock < p_quantity THEN
    RETURN FALSE;
  END IF;

  -- Get or create active order for the table
  SELECT id INTO v_order_id FROM orders WHERE table_id = p_table_id AND status = 'active' LIMIT 1;
  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, status) VALUES (p_table_id, 'active') RETURNING id INTO v_order_id;
    -- Set table status to occupied
    UPDATE tables SET status = 'occupied' WHERE id = p_table_id;
  END IF;

  -- Insert order item
  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price)
  VALUES (v_order_id, p_menu_item_id, p_quantity, p_unit_price);

  -- Deduct stock
  UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. Enable Row Level Security (RLS) & Add Policies for client access
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to employees" ON employees;
CREATE POLICY "Allow public read access to employees" ON employees FOR SELECT USING (true);

ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access to tables" ON tables;
CREATE POLICY "Allow public read/write access to tables" ON tables FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to menu_items" ON menu_items;
CREATE POLICY "Allow public read access to menu_items" ON menu_items FOR SELECT USING (true);

