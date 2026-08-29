-- Sprint F — L17: discount_applied removed from order_items
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'discount_applied'
  ) THEN
    RAISE EXCEPTION 'order_items.discount_applied should be dropped';
  END IF;
END $$;

ROLLBACK;
