-- =============================================
-- Migration: Enable Supabase Realtime Publication for core tables
-- =============================================

DO $$
BEGIN
  -- Add tables to supabase_realtime publication if publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tables;
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE qr_sessions;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
