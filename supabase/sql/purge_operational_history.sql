-- ล้างประวัติการขาย / ออเดอร์ / สถิติ — เก็บ menu_items, promotions, employees, organizations
-- รันได้ผ่าน scripts/purge-operational-data.mjs หรือ migration 20260927

BEGIN;

TRUNCATE TABLE
  public.payment_promotions,
  public.payments,
  public.order_items,
  public.orders,
  public.void_logs,
  public.stock_logs,
  public.qr_sessions,
  public.points_logs,
  public.item_ingredients,
  public.purchase_orders,
  public.login_audit,
  public.staff_sessions
RESTART IDENTITY CASCADE;

UPDATE public.loyalty_members
SET points = 0;

UPDATE public.tables
SET status = 'vacant',
    updated_at = NOW();

COMMIT;
