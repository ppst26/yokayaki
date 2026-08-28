-- Sprint F (L17): order_items.discount_applied was never written — promotions apply at payment level.
ALTER TABLE public.order_items DROP COLUMN IF EXISTS discount_applied;
