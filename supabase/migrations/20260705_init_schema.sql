-- Drop tables if they exist in reverse dependency order
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS void_logs CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS qr_sessions CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS loyalty_members CASCADE;

-- 1. Create employees table
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL, -- SHA-256 hash representation of 6-digit PIN
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create tables table
CREATE TABLE tables (
  id INT PRIMARY KEY, -- Table number 1, 2, 3, 4
  status VARCHAR(20) NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'checking_out')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create qr_sessions table
CREATE TABLE qr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id INT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expired_at TIMESTAMP WITH TIME ZONE
);

-- 4. Create menu_items table
CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  is_happy_hour BOOLEAN NOT NULL DEFAULT FALSE,
  happy_hour_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  table_id INT NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
  qr_session_id UUID REFERENCES qr_sessions(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'voided')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create order_items table
CREATE TABLE order_items (
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
CREATE TABLE void_logs (
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
CREATE TABLE loyalty_members (
  phone_number VARCHAR(10) PRIMARY KEY CHECK (length(phone_number) = 10),
  name VARCHAR(100) NOT NULL,
  points INT NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create payments table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'promptpay', 'mixed')),
  subtotal DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10, 2) NOT NULL,
  points_earned INT NOT NULL DEFAULT 0,
  points_redeemed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --- Insert Seed Data ---

-- Employees:
-- PIN 111111 hash: '3d15414e86a07998634c442cf6f76c02ef4906f3657a829e3a6a1608ebcf559b' (Placeholder example hash)
-- PIN 222222 hash: 'b149b5df16682ab81b7e0129dc47c5d0ad4a50d60655883ef4a73229b46bd9d1' (Placeholder example hash)
INSERT INTO employees (name, pin_hash, role) VALUES 
('Pee Pee (Owner)', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'owner'),
('Best (Staff)', '8d969ee76d243c53b6b3061467aa3b8d30c441408eb39af7194b14091118366d', 'staff');

-- Tables:
INSERT INTO tables (id, status) VALUES 
(1, 'vacant'),
(2, 'vacant'),
(3, 'vacant'),
(4, 'vacant')
ON CONFLICT (id) DO NOTHING;

-- Menu Items:
INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price) VALUES
('เบียร์สดโอกินาว่า', 120.00, 10, TRUE, 99.00),
('ยากิโทริสะโพกไก่ (4 ไม้)', 80.00, 3, FALSE, 80.00),
('แก้มปลาต้มซีอิ๊ว', 250.00, 0, FALSE, 250.00);

-- Loyalty Members:
INSERT INTO loyalty_members (phone_number, name, points) VALUES
('0812345678', 'สมชาย ใจดี', 50),
('0987654321', 'สมหญิง รักดี', 10);
