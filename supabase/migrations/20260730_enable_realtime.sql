-- =============================================
-- Migration: Enable Supabase Realtime Publication for core tables
--
-- M2 Sprint A: ไม่ใช้ EXCEPTION WHEN OTHERS THEN NULL (กลืน error ทั้งหมด)
-- เพิ่ม REPLICA IDENTITY FULL เพื่อให้ UPDATE/DELETE ส่งค่าเดิมมาด้วย
-- =============================================

ALTER TABLE public.tables REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;
ALTER TABLE public.qr_sessions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['tables', 'orders', 'order_items', 'menu_items', 'qr_sessions'])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables pt
      WHERE pt.pubname = 'supabase_realtime'
        AND pt.schemaname = 'public'
        AND pt.tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
