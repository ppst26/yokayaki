-- Migration: Purchase Orders System
-- เพิ่มระบบ Purchase Order สำหรับบันทึกการสั่งซื้อวัตถุดิบเป็น batch

-- 1. สร้างตาราง purchase_orders (header ของการสั่งซื้อแต่ละครั้ง)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  buyer_name VARCHAR(255) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  note TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. เปิด RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to purchase_orders" ON purchase_orders;
CREATE POLICY "Allow public access to purchase_orders" ON purchase_orders
  FOR ALL USING (true) WITH CHECK (true);

-- 3. เพิ่ม FK ใน item_ingredients ให้อ้างอิง purchase_orders
ALTER TABLE item_ingredients
  ADD COLUMN IF NOT EXISTS purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE;

-- 4. สร้าง index สำหรับ query เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_item_ingredients_purchase_order_id
  ON item_ingredients(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_purchase_date
  ON purchase_orders(purchase_date);
