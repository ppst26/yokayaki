-- =============================================================
-- PERF/5 — index สำหรับเส้นทางที่ยิงบ่อยที่สุด
--
-- 1) จอครัวคิวรี order_items WHERE status = 'pending' แต่ไม่มี index บน status
--    → seq scan ทั้งตาราง order_items ซึ่งเป็นตารางที่โตตลอดไปไม่เคยลบ
--    วันนี้ยังไม่เจ็บเพราะแถวยังน้อย แต่ช้าลงเชิงเส้นตามยอดขายสะสม
--
-- 2) RLS ทุก policy หลัง M4 กรองด้วย org_id = jwt_org_id()
--    แต่ไม่มี index บน org_id เลยสักตาราง → ทุกคิวรีของทุกจอสแกนข้ามข้อมูลร้านอื่น
--
-- ใช้ IF NOT EXISTS ทั้งหมด — รันซ้ำได้ ไม่ชนกับ index เดิม
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. จอครัว + ตัวนับ "ค้างครัว" ในผังโต๊ะ
--    partial index: เก็บเฉพาะแถว pending ซึ่งเป็นส่วนน้อยมากของตาราง
--    → index เล็ก อ่านเร็ว และไม่ถ่วง INSERT/UPDATE ของแถวที่เสิร์ฟไปแล้ว
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_order_items_pending
  ON public.order_items (order_id)
  WHERE status = 'pending';

-- -------------------------------------------------------------
-- 2. org_id — ตารางที่ถูกอ่านในเส้นทางปกติของ POS
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_menu_items_org
  ON public.menu_items (org_id);

CREATE INDEX IF NOT EXISTS idx_tables_org
  ON public.tables (org_id);

CREATE INDEX IF NOT EXISTS idx_orders_org_status
  ON public.orders (org_id, status);

CREATE INDEX IF NOT EXISTS idx_order_items_org
  ON public.order_items (org_id);

CREATE INDEX IF NOT EXISTS idx_promotions_org_active
  ON public.promotions (org_id, is_active);

CREATE INDEX IF NOT EXISTS idx_qr_sessions_org
  ON public.qr_sessions (org_id);

-- -------------------------------------------------------------
-- 3. org_id — ตารางรายงาน (Dashboard / ประวัติการขาย ดึงเป็นช่วงวันที่)
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_org_created
  ON public.payments (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_void_logs_org_created
  ON public.void_logs (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_logs_org
  ON public.stock_logs (org_id);

CREATE INDEX IF NOT EXISTS idx_points_logs_org
  ON public.points_logs (org_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_members_org
  ON public.loyalty_members (org_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_org
  ON public.purchase_orders (org_id);

CREATE INDEX IF NOT EXISTS idx_item_ingredients_org
  ON public.item_ingredients (org_id);

CREATE INDEX IF NOT EXISTS idx_payment_promotions_org
  ON public.payment_promotions (org_id);

COMMIT;
