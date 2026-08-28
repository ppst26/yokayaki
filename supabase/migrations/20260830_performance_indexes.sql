-- =============================================================
-- M2 / H1 — Hot-path indexes
--
-- ปัจจุบันมีแค่ PK + 2 index จาก purchase_orders migration
-- และ unique จาก M0 (uniq_payment_per_order · uniq_active_order_per_table)
-- ไฟล์นี้เพิ่ม index ที่ขาดสำหรับสั่งอาหาร / ครัว / checkout / dashboard / CRM
-- =============================================================

BEGIN;

-- สั่งอาหาร + หาบิล active ต่อโต๊ะ
CREATE INDEX IF NOT EXISTS idx_orders_table_status
  ON orders (table_id, status);

-- ครัว / checkout / void — ดึงรายการต่อบิล
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items (order_id);

-- Dashboard / SalesHistory — filter ตามวันที่
CREATE INDEX IF NOT EXISTS idx_payments_created_at
  ON payments (created_at);

-- ค้นหาสมาชิกจากบิล
CREATE INDEX IF NOT EXISTS idx_payments_phone
  ON payments (phone_number)
  WHERE phone_number IS NOT NULL;

-- verify_pin สแกน pin_bcrypt (pin_hash ถูก DROP ใน 20260825)
CREATE INDEX IF NOT EXISTS idx_employees_pin_bcrypt
  ON employees (pin_bcrypt)
  WHERE pin_bcrypt IS NOT NULL;

-- เช็คบิล QR — หา session ต่อโต๊ะ
CREATE INDEX IF NOT EXISTS idx_qr_sessions_table
  ON qr_sessions (table_id, status);

-- รายงาน void
CREATE INDEX IF NOT EXISTS idx_void_logs_created_at
  ON void_logs (created_at);

-- ประวัติแต้ม CRM
CREATE INDEX IF NOT EXISTS idx_points_logs_phone
  ON points_logs (phone_number);

-- join โปรในบิล (SalesHistory)
CREATE INDEX IF NOT EXISTS idx_payment_promos_pay
  ON payment_promotions (payment_id);

COMMIT;
