-- อัปเดตชื่อร้านบนใบเสร็จ / PromptPay merchant เป็น Yoyaki
UPDATE public.org_settings
SET receipt_merchant_name = 'Yoyaki'
WHERE receipt_merchant_name IN ('YOKAYAKI', 'YOKAYAKI IZAKAYA');

ALTER TABLE public.org_settings
  ALTER COLUMN receipt_merchant_name SET DEFAULT 'Yoyaki';
