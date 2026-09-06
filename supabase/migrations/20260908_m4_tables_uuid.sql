BEGIN;

-- =============================================================
-- M4 / 4c — rewrite tables to UUID PK + table_number + update FKs
-- =============================================================

-- 1. เพิ่ม table_number และ new_id บน tables
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS table_number INT;
UPDATE public.tables SET table_number = id WHERE table_number IS NULL;

ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
UPDATE public.tables SET new_id = gen_random_uuid() WHERE new_id IS NULL;

-- 2. สร้างตาราง mapping ชั่วคราว
CREATE TEMP TABLE _table_id_map AS
SELECT id AS old_id, new_id, org_id, table_number FROM public.tables;

-- 3. เพิ่มคอลัมน์ UUID บน orders และ qr_sessions และ migrate ข้อมูล
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_id_uuid UUID;
UPDATE public.orders o
SET table_id_uuid = m.new_id
FROM _table_id_map m
WHERE o.table_id = m.old_id;

ALTER TABLE public.qr_sessions ADD COLUMN IF NOT EXISTS table_id_uuid UUID;
UPDATE public.qr_sessions qs
SET table_id_uuid = m.new_id
FROM _table_id_map m
WHERE qs.table_id = m.old_id;

-- 4. DROP FK constraints เดิม
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_table_id_fkey;
ALTER TABLE public.qr_sessions DROP CONSTRAINT IF EXISTS qr_sessions_table_id_fkey;

-- 5. สลับคอลัมน์ table_id บน orders และ qr_sessions
ALTER TABLE public.orders DROP COLUMN table_id;
ALTER TABLE public.orders RENAME COLUMN table_id_uuid TO table_id;
ALTER TABLE public.orders ALTER COLUMN table_id SET NOT NULL;

ALTER TABLE public.qr_sessions DROP COLUMN table_id;
ALTER TABLE public.qr_sessions RENAME COLUMN table_id_uuid TO table_id;
ALTER TABLE public.qr_sessions ALTER COLUMN table_id SET NOT NULL;

-- 6. สลับ PK บน tables ให้เป็น UUID (new_id -> id)
ALTER TABLE public.tables DROP CONSTRAINT tables_pkey;
ALTER TABLE public.tables DROP COLUMN id;
ALTER TABLE public.tables RENAME COLUMN new_id TO id;
ALTER TABLE public.tables ADD PRIMARY KEY (id);
ALTER TABLE public.tables ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 7. ตั้ง table_number NOT NULL และ UNIQUE(org_id, table_number)
ALTER TABLE public.tables ALTER COLUMN table_number SET NOT NULL;
ALTER TABLE public.tables ADD CONSTRAINT tables_org_table_number_uniq UNIQUE (org_id, table_number);

-- 8. สร้าง FK constraints กลับมา
ALTER TABLE public.orders
  ADD CONSTRAINT orders_table_id_fkey
  FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE RESTRICT;

ALTER TABLE public.qr_sessions
  ADD CONSTRAINT qr_sessions_table_id_fkey
  FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT orders_table_id_fkey ON orders IS
  'A7.7 — ห้ามลบโต๊ะถ้ายังมี orders ค้างอยู่';

-- 9. สร้าง indexes ที่อิง table_id
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_order_per_table
  ON public.orders(table_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_orders_table_status
  ON public.orders(table_id, status);

CREATE INDEX IF NOT EXISTS idx_qr_sessions_table
  ON public.qr_sessions(table_id, status);

COMMIT;
