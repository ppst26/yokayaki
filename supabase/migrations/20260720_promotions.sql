-- =============================================
-- Migration: Promotions & Discounts
-- =============================================

-- 1. สร้างตาราง promotions
CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed', 'buy_x_get_y')),
  -- percentage: ลด X%
  discount_percent INT DEFAULT NULL,
  -- fixed: ลดเป็นจำนวนเงิน (คูปองโค้ด)
  discount_amount DECIMAL(10,2) DEFAULT NULL,
  coupon_code VARCHAR(30) DEFAULT NULL,
  -- buy_x_get_y: ซื้อ X แถม Y
  buy_qty INT DEFAULT NULL,
  free_qty INT DEFAULT NULL,
  -- เงื่อนไข
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read promotions for authenticated" ON promotions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for service role" ON promotions
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow insert promotions for anon" ON promotions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update promotions for anon" ON promotions
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete promotions for anon" ON promotions
  FOR DELETE TO anon USING (true);

CREATE POLICY "Allow select promotions for anon" ON promotions
  FOR SELECT TO anon USING (true);
