### Task 1: Migration 4a — `organizations`, `org_settings`, `org_id` columns

**Files:**
- Create: `supabase/migrations/20260906_m4_organizations_org_id.sql`

**Interfaces:**
- Produces:
  - ตาราง `organizations`, `org_settings`
  - คอลัมน์ `org_id UUID NOT NULL` ในทุกตาราง operational (รายการใน spec §1)
  - default org `00000000-0000-4000-8000-000000000001` + seed `org_settings`
  - `loyalty_members` PK เป็น `(org_id, phone_number)` · `payments` FK composite

- [ ] **Step 1: สร้าง migration 4a**

สร้าง `supabase/migrations/20260906_m4_organizations_org_id.sql`:

```sql
BEGIN;

-- =============================================================
-- M4 / 4a — organizations · org_settings · org_id + backfill
-- =============================================================

CREATE TABLE public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.org_settings (
  org_id                 UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE RESTRICT,
  promptpay_id           TEXT,
  receipt_merchant_name  TEXT NOT NULL DEFAULT 'YOKAYAKI',
  timezone               TEXT NOT NULL DEFAULT 'Asia/Bangkok'
);

REVOKE ALL ON public.organizations, public.org_settings FROM anon, authenticated;
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.org_settings TO authenticated;

INSERT INTO public.organizations (id, name, slug)
VALUES ('00000000-0000-4000-8000-000000000001', 'Yokayaki', 'yokayaki-default');

INSERT INTO public.org_settings (org_id, receipt_merchant_name)
VALUES ('00000000-0000-4000-8000-000000000001', 'YOKAYAKI');

-- employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS org_id UUID;
UPDATE public.employees SET org_id = '00000000-0000-4000-8000-000000000001' WHERE org_id IS NULL;
ALTER TABLE public.employees ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.employees
  ADD CONSTRAINT employees_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- master tables
ALTER TABLE public.menu_items    ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.promotions    ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.tables        ADD COLUMN IF NOT EXISTS org_id UUID;

UPDATE public.menu_items    SET org_id = '00000000-0000-4000-8000-000000000001' WHERE org_id IS NULL;
UPDATE public.promotions    SET org_id = '00000000-0000-4000-8000-000000000001' WHERE org_id IS NULL;
UPDATE public.tables        SET org_id = '00000000-0000-4000-8000-000000000001' WHERE org_id IS NULL;

ALTER TABLE public.menu_items    ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.promotions    ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.tables        ALTER COLUMN org_id SET NOT NULL;

-- transaction / logs (เพิ่ม org_id ก่อน loyalty PK migration)
ALTER TABLE public.orders              ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.order_items         ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.payments            ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.payment_promotions  ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.qr_sessions         ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.void_logs           ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.stock_logs          ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.points_logs         ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.purchase_orders     ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.item_ingredients    ADD COLUMN IF NOT EXISTS org_id UUID;

UPDATE public.orders o SET org_id = t.org_id
FROM public.tables t WHERE o.table_id = t.id AND o.org_id IS NULL;

UPDATE public.order_items oi SET org_id = o.org_id
FROM public.orders o WHERE oi.order_id = o.id AND oi.org_id IS NULL;

UPDATE public.payments p SET org_id = o.org_id
FROM public.orders o WHERE p.order_id = o.id AND p.org_id IS NULL;

UPDATE public.payment_promotions pp SET org_id = p.org_id
FROM public.payments p WHERE pp.payment_id = p.id AND pp.org_id IS NULL;

UPDATE public.qr_sessions qs SET org_id = t.org_id
FROM public.tables t WHERE qs.table_id = t.id AND qs.org_id IS NULL;

UPDATE public.void_logs SET org_id = '00000000-0000-4000-8000-000000000001' WHERE org_id IS NULL;
UPDATE public.stock_logs SET org_id = '00000000-0000-4000-8000-000000000001' WHERE org_id IS NULL;
UPDATE public.points_logs SET org_id = '00000000-0000-4000-8000-000000000001' WHERE org_id IS NULL;
UPDATE public.purchase_orders SET org_id = '00000000-0000-4000-8000-000000000001' WHERE org_id IS NULL;
UPDATE public.item_ingredients SET org_id = '00000000-0000-4000-8000-000000000001' WHERE org_id IS NULL;

ALTER TABLE public.orders              ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.order_items         ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.payments            ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.payment_promotions  ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.qr_sessions         ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.void_logs           ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.stock_logs          ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.points_logs         ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.purchase_orders     ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.item_ingredients    ALTER COLUMN org_id SET NOT NULL;

-- loyalty_members: composite PK
ALTER TABLE public.loyalty_members ADD COLUMN IF NOT EXISTS org_id UUID;
UPDATE public.loyalty_members SET org_id = '00000000-0000-4000-8000-000000000001' WHERE org_id IS NULL;
ALTER TABLE public.loyalty_members ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_phone_number_fkey;

ALTER TABLE public.loyalty_members DROP CONSTRAINT IF EXISTS loyalty_members_pkey;
ALTER TABLE public.loyalty_members ADD PRIMARY KEY (org_id, phone_number);
ALTER TABLE public.loyalty_members
  ADD CONSTRAINT loyalty_members_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_loyalty_fkey
  FOREIGN KEY (org_id, phone_number) REFERENCES public.loyalty_members(org_id, phone_number)
  ON DELETE SET NULL;

-- FK org_id ทุกตาราง
ALTER TABLE public.menu_items    ADD CONSTRAINT menu_items_org_id_fkey    FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.promotions    ADD CONSTRAINT promotions_org_id_fkey    FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.tables        ADD CONSTRAINT tables_org_id_fkey        FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.orders        ADD CONSTRAINT orders_org_id_fkey        FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.order_items   ADD CONSTRAINT order_items_org_id_fkey   FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.payments      ADD CONSTRAINT payments_org_id_fkey      FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.payment_promotions ADD CONSTRAINT payment_promotions_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.qr_sessions   ADD CONSTRAINT qr_sessions_org_id_fkey   FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.void_logs     ADD CONSTRAINT void_logs_org_id_fkey     FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.stock_logs    ADD CONSTRAINT stock_logs_org_id_fkey    FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.points_logs   ADD CONSTRAINT points_logs_org_id_fkey   FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.item_ingredients ADD CONSTRAINT item_ingredients_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_settings  ENABLE ROW LEVEL SECURITY;

COMMIT;
```

- [ ] **Step 2: รัน migration บน docker**

```bash
pnpm db:reset
```

Expected: migration ผ่านไม่ error (RLS ยังเป็นแบบเดิม — ข้อมูลยังอ่านได้ทั้งระบบ)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260906_m4_organizations_org_id.sql
git commit -m "feat(db): M4 4a organizations and org_id columns"
```

---

