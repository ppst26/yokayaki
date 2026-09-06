# M4 Multi-Tenancy (org-only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แยก tenant ด้วย `org_id` — staff ของ org A มอง/แตะข้อมูล org B ไม่ได้ · config ร้าน (PromptPay, ชื่อบน QR) อ่านจาก `org_settings` · `tables.id` เป็น UUID

**Architecture:** Phase 4a เพิ่ม `organizations`/`org_settings` + `org_id` ทุกตาราง operational แล้ว backfill default org · Phase 4b ใส่ `org_id` ใน JWT + `jwt_org_id()` + RLS ใหม่ · Phase 4c rewrite `tables` เป็น UUID + RPC ตรวจ org · Phase 4d แก้แอป/scripts/tests

**Tech Stack:** PostgreSQL migrations, Supabase RLS, Next.js 16 App Router, TypeScript, `jose` JWT, Vitest, Playwright E2E

**Spec:** `docs/superpowers/specs/2026-09-06-m4-multi-tenancy-org-design.md` (อนุมัติแล้ว)

## Global Constraints

- ขอบเขต tenant = **`org_id` เท่านั้น** — ไม่มี `branches` ใน M4
- Default org UUID คงที่: `00000000-0000-4000-8000-000000000001`
- ห้าม policy/grant ให้ `anon` · ทุก policy `TO authenticated` + `is_staff()`/`is_owner()` + `org_id = jwt_org_id()`
- สร้างฟังก์ชัน/RPC ใหม่ต้อง **`REVOKE EXECUTE FROM PUBLIC, anon`** แล้ว GRANT เฉพาะ role ที่ต้องใช้
- ห้ามรับ `org_id` จาก client body เป็นแหล่งความจริง — derive จาก JWT หรือ parent row ใน RPC
- `pin_attempts` **ไม่**ใส่ `org_id`
- ใช้ `pnpm` เท่านั้น · หลังทุก migration รัน `pnpm db:reset && pnpm db:test`
- อย่า commit `.env.local` หรือ secrets

## Constants (ใช้ทุก task)

```sql
-- ใน migration และเทสต์
\set default_org '00000000-0000-4000-8000-000000000001'
```

## File map

| ไฟล์ | หน้าที่ |
|---|---|
| `supabase/migrations/20260906_m4_organizations_org_id.sql` | 4a — org tables + org_id + backfill + loyalty PK |
| `supabase/migrations/20260906_m4_jwt_org_rls.sql` | 4b — `jwt_org_id()` + RLS rewrite |
| `supabase/migrations/20260906_m4_tables_uuid.sql` | 4c — rewrite `tables` PK + FK |
| `supabase/migrations/20260906_m4_rpc_org_guards.sql` | 4c — RPC ตรวจ org + `admin_add_employee` |
| `lib/authToken.ts` | claim `orgId` ใน JWT |
| `app/api/auth/login/route.ts` | อ่าน `employees.org_id` |
| `lib/api/schemas.ts` | `tableId` เป็น UUID string |
| `lib/customerSession.ts` | `tableId: string` + ตรวจ `org_id` |
| `components/common/TableMap.tsx` | UUID + `table_number` |
| `components/order/POSOrderScreen.tsx` | UUID + แสดงเลขโต๊ะ |
| `components/checkout/CheckoutScreen.tsx` | โหลด `org_settings` |
| `components/kitchen/KitchenScreen.tsx` | แสดง `table_number` |
| `components/common/TableCard.tsx` | แสดง `table_number` |
| `scripts/create-org.mjs` | สร้าง org ที่ 2 สำหรับ test/staging |
| `scripts/migrate-org-settings.mjs` | env → default org `org_settings` |
| `supabase/tests/tenant_isolation.sql` | พิสูจน์ 2 org แยกกัน |
| `supabase/tests/rls_policies.sql` | อัปเดต policy บัญชี + seed ใหม่ |
| `supabase/tests/security.sql` | แก้ lookup โต๊ะเป็น UUID |
| `lib/database.types.ts` | regen หลัง migration |
| `MODULES_MILESTONES.md` | ปิด M4 |

---

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

### Task 2: Migration 4b — `jwt_org_id()` + RLS rewrite

**Files:**
- Create: `supabase/migrations/20260906_m4_jwt_org_rls.sql`

**Interfaces:**
- Produces:
  - `public.jwt_org_id() RETURNS UUID`
  - policy ทุกตาราง operational ใช้ `org_id = public.jwt_org_id() AND public.is_staff()` (หรือ `is_owner()`)
  - policy `organizations` / `org_settings` อ่านได้เฉพาะ org ของ JWT

- [ ] **Step 1: สร้าง migration 4b**

สร้าง `supabase/migrations/20260906_m4_jwt_org_rls.sql` — ลบ policy เก่าทุกตัวใน `public` แล้วสร้างใหม่:

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.jwt_org_id()
RETURNS UUID
LANGUAGE sql STABLE
SET search_path = public
AS $fn$
  SELECT NULLIF(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'org_id', ''
  )::UUID;
$fn$;

REVOKE EXECUTE ON FUNCTION public.jwt_org_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jwt_org_id() TO authenticated, service_role;

-- DROP policies เก่า (ชื่อจาก 20260824)
DO $do$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$do$;

-- organizations / org_settings
CREATE POLICY org_read ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY org_settings_read ON public.org_settings
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

-- pattern สำหรับตารางที่มี org_id
CREATE POLICY staff_read ON public.tables
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.orders
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.order_items
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_serve ON public.order_items
  FOR UPDATE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.menu_items
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY owner_write ON public.menu_items
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY staff_read ON public.promotions
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY owner_write ON public.promotions
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY staff_read ON public.qr_sessions
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_create ON public.qr_sessions
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.loyalty_members
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_create ON public.loyalty_members
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY owner_update ON public.loyalty_members
  FOR UPDATE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_delete ON public.loyalty_members
  FOR DELETE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY staff_read ON public.payments
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.payment_promotions
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY staff_read ON public.void_logs
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff());

CREATE POLICY owner_read ON public.stock_logs
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_read ON public.points_logs
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_write ON public.points_logs
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_read ON public.item_ingredients
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_write ON public.item_ingredients
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_read ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY owner_write ON public.purchase_orders
  FOR ALL TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_owner())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner());

CREATE POLICY staff_update ON public.tables
  FOR UPDATE TO authenticated
  USING (org_id = public.jwt_org_id() AND public.is_staff())
  WITH CHECK (org_id = public.jwt_org_id() AND public.is_staff());

COMMIT;
```

- [ ] **Step 2: รัน db:reset**

```bash
pnpm db:reset
```

Expected: ผ่าน (เทสต์ SQL ยังไม่ผ่านทั้งหมด — แก้ใน Task 7–8)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260906_m4_jwt_org_rls.sql
git commit -m "feat(db): M4 4b jwt_org_id and tenant-scoped RLS"
```

---

### Task 3: JWT login — `org_id` claim

**Files:**
- Modify: `lib/authToken.ts`
- Modify: `app/api/auth/login/route.ts`
- Test: `lib/authToken.test.ts` (สร้างใหม่)

**Interfaces:**
- Produces:
  - `StaffClaims.orgId: string`
  - JWT payload `org_id: string` (UUID)
  - `verifyStaffToken()` คืน `orgId` หรือ `null` ถ้าไม่มี claim

- [ ] **Step 1: เขียน failing test**

สร้าง `lib/authToken.test.ts`:

```ts
import { describe, expect, it, beforeAll } from 'vitest';
import { signStaffToken, verifyStaffToken } from '@/lib/authToken';

const ORG = '00000000-0000-4000-8000-000000000001';

beforeAll(() => {
  if (!process.env.SUPABASE_JWT_SECRET && !process.env.SUPABASE_JWT_SIGNING_JWK) {
    process.env.SUPABASE_JWT_SECRET = 'test-secret-at-least-32-chars-long!!';
  }
});

describe('signStaffToken', () => {
  it('ใส่ org_id ใน JWT', async () => {
    const token = await signStaffToken({
      empId: 1,
      empName: 'ทดสอบ',
      empRole: 'owner',
      orgId: ORG,
    });
    const claims = await verifyStaffToken(token);
    expect(claims?.orgId).toBe(ORG);
  });
});
```

- [ ] **Step 2: รันให้ล้ม**

```bash
pnpm test:unit lib/authToken.test.ts
```

Expected: FAIL — `orgId` ไม่มีใน type หรือ verify คืน undefined

- [ ] **Step 3: แก้ `lib/authToken.ts`**

```ts
export interface StaffClaims {
  empId: number;
  empName: string;
  empRole: EmployeeRole;
  orgId: string;
}

// ใน signStaffToken:
  return new SignJWT({
    role: 'authenticated',
    emp_id: claims.empId,
    emp_name: claims.empName,
    emp_role: claims.empRole,
    org_id: claims.orgId,
  })

// ใน verifyStaffToken:
    const orgId = payload.org_id;
    if (typeof orgId !== 'string' || !orgId) return null;

    return {
      empId,
      empName: typeof empName === 'string' ? empName : '',
      empRole,
      orgId,
    };
```

- [ ] **Step 4: แก้ `app/api/auth/login/route.ts`**

หลัง verify_pin สำเร็จ อ่าน `org_id`:

```ts
    const { data: empRow, error: empError } = await supabaseAdmin
      .from('employees')
      .select('org_id')
      .eq('id', row.emp_id)
      .single();

    if (empError || !empRow?.org_id) {
      return Response.json({ error: 'ไม่พบข้อมูลองค์กรของพนักงาน' }, { status: 500 });
    }

    const token = await signStaffToken({
      empId: employee.id,
      empName: employee.name,
      empRole: employee.role,
      orgId: empRow.org_id,
    });
```

- [ ] **Step 5: รัน unit test**

```bash
pnpm test:unit lib/authToken.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/authToken.ts lib/authToken.test.ts app/api/auth/login/route.ts
git commit -m "feat(auth): add org_id to staff JWT at login"
```

---

### Task 4: Migration 4c — rewrite `tables` เป็น UUID

**Files:**
- Create: `supabase/migrations/20260906_m4_tables_uuid.sql`

**Interfaces:**
- Produces:
  - `tables.id` UUID PK
  - `tables.table_number INT` + `UNIQUE(org_id, table_number)`
  - `orders.table_id`, `qr_sessions.table_id` เป็น UUID FK

- [ ] **Step 1: สร้าง migration**

สร้าง `supabase/migrations/20260906_m4_tables_uuid.sql`:

```sql
BEGIN;

ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS table_number INT;
UPDATE public.tables SET table_number = id WHERE table_number IS NULL;

ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
UPDATE public.tables SET new_id = gen_random_uuid() WHERE new_id IS NULL;

-- mapping ชั่วคราว
CREATE TEMP TABLE _table_id_map AS
SELECT id AS old_id, new_id, org_id, table_number FROM public.tables;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_table_id_fkey;
ALTER TABLE public.qr_sessions DROP CONSTRAINT IF EXISTS qr_sessions_table_id_fkey;

UPDATE public.orders o
SET table_id = NULL
FROM _table_id_map m
WHERE o.table_id = m.old_id;

-- orders.table_id ยังเป็น INT — ต้องเปลี่ยนชนิด
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

ALTER TABLE public.orders DROP COLUMN table_id;
ALTER TABLE public.orders RENAME COLUMN table_id_uuid TO table_id;
ALTER TABLE public.orders ALTER COLUMN table_id SET NOT NULL;

ALTER TABLE public.qr_sessions DROP COLUMN table_id;
ALTER TABLE public.qr_sessions RENAME COLUMN table_id_uuid TO table_id;
ALTER TABLE public.qr_sessions ALTER COLUMN table_id SET NOT NULL;

ALTER TABLE public.tables DROP CONSTRAINT tables_pkey;
ALTER TABLE public.tables DROP COLUMN id;
ALTER TABLE public.tables RENAME COLUMN new_id TO id;
ALTER TABLE public.tables ADD PRIMARY KEY (id);
ALTER TABLE public.tables ALTER COLUMN table_number SET NOT NULL;
ALTER TABLE public.tables ADD CONSTRAINT tables_org_table_number_uniq UNIQUE (org_id, table_number);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_table_id_fkey
  FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE RESTRICT;

ALTER TABLE public.qr_sessions
  ADD CONSTRAINT qr_sessions_table_id_fkey
  FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_order_per_table
  ON public.orders(table_id) WHERE status = 'active';

COMMIT;
```

> หมายเหตุ implementer: ถ้า migration ล้มเพราะ constraint/ชนิดคอลัมน์ ให้ปรับลำดับ DROP/ADD ให้สอดคล้องกับ FK จริงใน DB แต่ **ผลลัพธ์สุดท้าย** ต้องตรง schema ด้านบน

- [ ] **Step 2: db:reset**

```bash
pnpm db:reset
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260906_m4_tables_uuid.sql
git commit -m "feat(db): M4 4c tables UUID primary key"
```

---

### Task 5: Migration 4c — RPC org guards + `admin_add_employee`

**Files:**
- Create: `supabase/migrations/20260906_m4_rpc_org_guards.sql`

**Interfaces:**
- Produces:
  - `place_order_batch(p_table_id UUID, ...)` ตรวจ `tables.org_id = jwt_org_id()`
  - `place_order_item(p_table_id UUID, ...)` เหมือนกัน
  - `customer_place_order_batch` / `customer_place_order_item` ตรวจ session→table→org
  - `complete_checkout`, `void_order_item`, `adjust_loyalty_points`, `upsert_purchase_order` ตรวจ org
  - `admin_add_employee(p_name, p_pin, p_role, p_org_id UUID)`

- [ ] **Step 1: อัปเดต `place_order_batch`**

ใน migration ใหม่ — เปลี่ยน signature และเพิ่ม guard หัวฟังก์ชัน:

```sql
CREATE OR REPLACE FUNCTION public.place_order_batch(
  p_table_id UUID,
  p_items    JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_org UUID := public.jwt_org_id();
BEGIN
  IF v_org IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  PERFORM 1 FROM tables t
  WHERE t.id = p_table_id AND t.org_id = v_org
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_table'; END IF;

  -- ... เนื้อหาเดิมจาก 20260829 (loop stock, insert order_items) ...
  -- INSERT orders ต้องใส่ org_id := v_org
  -- INSERT order_items ต้องใส่ org_id := v_org
END;
$fn$;
```

คัดลอก body เดิมจาก `supabase/migrations/20260829_order_batch_rpc.sql` แล้วเติม `org_id` ทุก INSERT

- [ ] **Step 2: อัปเดต RPC ที่เหลือ**

ทำแบบเดียวกันกับ:
- `place_order_item` — `p_table_id UUID` + guard org
- `customer_place_order_batch` — ไม่ใช้ JWT · ตรวจ `qr_sessions` join `tables` ว่า `tables.org_id = qr_sessions.org_id`
- `complete_checkout` — `SELECT org_id FROM orders WHERE id = p_order_id` ต้องเท่า `jwt_org_id()` (staff path)
- `void_order_item` — join order → org
- `adjust_loyalty_points` — `loyalty_members.org_id = jwt_org_id()`
- `upsert_purchase_order` — stamp `org_id` จาก JWT

- [ ] **Step 3: `admin_add_employee`**

```sql
CREATE OR REPLACE FUNCTION public.admin_add_employee(
  p_name TEXT, p_pin TEXT, p_role TEXT, p_org_id UUID
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $fn$
DECLARE v_id INT;
BEGIN
  IF p_org_id IS NULL OR NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'invalid_org';
  END IF;
  -- ... validation เดิม ...
  INSERT INTO employees (name, role, pin_bcrypt, org_id)
  VALUES (TRIM(p_name), p_role, crypt(p_pin, gen_salt('bf', 10)), p_org_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.admin_add_employee(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_employee(TEXT, TEXT, TEXT, UUID) TO service_role;
```

DROP overload `(TEXT, TEXT, TEXT)` เก่า

- [ ] **Step 4: db:reset**

```bash
pnpm db:reset
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260906_m4_rpc_org_guards.sql
git commit -m "feat(db): M4 RPC org guards and admin_add_employee org_id"
```

---

### Task 6: App — `tableId` UUID + แสดง `table_number`

**Files:**
- Modify: `lib/api/schemas.ts`
- Modify: `components/common/TableMap.tsx`
- Modify: `components/common/TableCard.tsx`
- Modify: `components/order/POSOrderScreen.tsx`
- Modify: `components/checkout/CheckoutScreen.tsx`
- Modify: `components/kitchen/KitchenScreen.tsx`
- Modify: `components/kitchen/KitchenOrderCard.tsx`
- Modify: `components/order/CustomerQRModal.tsx`
- Modify: `components/sales/SalesHistory.tsx`
- Modify: `lib/customerSession.ts`
- Modify: `app/api/customer/[session_id]/state/route.ts`
- Modify: `app/api/customer/[session_id]/check-bill/route.ts`

**Interfaces:**
- Consumes: `tables` มี `{ id: string, table_number: number, status, org_id }`
- Produces: props `tableId: string` · UI แสดง `table_number`

- [ ] **Step 1: แก้ schema**

ใน `lib/api/schemas.ts`:

```ts
export const tableIdSchema = z.string().uuid('รหัสโต๊ะไม่ถูกต้อง');

export const staffOrderBodySchema = z.object({
  tableId: tableIdSchema,
  items: orderItemsSchema,
});
```

- [ ] **Step 2: แก้ `TableMap` interface + state**

```ts
interface Table {
  id: string;
  table_number: number;
  status: 'vacant' | 'occupied' | 'checking_out';
  updated_at: string;
}

const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
// ... เหมือนกันสำหรับ checkoutTableId, actionSelectorTable

// fetchTables:
.select('id, table_number, status, updated_at')
.order('table_number', { ascending: true });

// ส่งไป POS/Checkout:
<POSOrderScreen tableId={selectedTableId} tableNumber={...} onBack={...} />
```

เพิ่ม prop `tableNumber: number` ให้ `POSOrderScreen` และ `CheckoutScreen` สำหรับข้อความ "โต๊ะ X"

- [ ] **Step 3: แก้ `TableCard`**

แสดง `โต๊ะ {table.table_number}` แทน `โต๊ะ {table.id}`

- [ ] **Step 4: แก้ `KitchenScreen`**

group ออเดอร์ด้วย `table_number` (join `tables` หรือ select `tables(table_number)`)

- [ ] **Step 5: แก้ `lib/customerSession.ts`**

```ts
export interface CustomerSession {
  sessionId: string;
  tableId: string;
  orgId: string;
}

// select: 'table_id, org_id, status, expired_at'
// return tableId: data.table_id as string, orgId: data.org_id
```

- [ ] **Step 6: typecheck**

```bash
pnpm typecheck
```

Expected: ไม่มี error เรื่อง `tableId: number`

- [ ] **Step 7: Commit**

```bash
git add lib/api/schemas.ts components/ lib/customerSession.ts app/api/customer/
git commit -m "feat(app): tableId UUID and display table_number"
```

---

### Task 7: App — `org_settings` แทน env PromptPay

**Files:**
- Modify: `components/checkout/CheckoutScreen.tsx`
- Modify: `lib/promptPay.ts` (ถ้ายัง hardcode merchant name)
- Modify: `.env.example`

**Interfaces:**
- Consumes: `org_settings` ผ่าน supabase client (RLS staff_read)
- Produces: `promptPayId`, `merchantName` จาก DB

- [ ] **Step 1: โหลด settings ใน CheckoutScreen**

```ts
const [orgSettings, setOrgSettings] = useState<{
  promptpay_id: string | null;
  receipt_merchant_name: string;
} | null>(null);

const fetchOrgSettings = async () => {
  const { data, error } = await supabase
    .from('org_settings')
    .select('promptpay_id, receipt_merchant_name')
    .maybeSingle();
  if (error) throw error;
  setOrgSettings(data);
};

// แทน process.env.NEXT_PUBLIC_PROMPTPAY_ID:
const promptPayId = (orgSettings?.promptpay_id ?? '').replace(/[^0-9]/g, '');
const merchantName = orgSettings?.receipt_merchant_name ?? 'YOKAYAKI';
```

ส่ง `merchantName` ให้ `generatePromptPayQR(...)` (ดู signature ใน `lib/promptPay.ts`)

- [ ] **Step 2: อัปเดต `.env.example`**

```diff
- NEXT_PUBLIC_PROMPTPAY_ID=
+ # PromptPay ต่อร้านอยู่ใน org_settings — รัน scripts/migrate-org-settings.mjs หลัง deploy
+ # NEXT_PUBLIC_PROMPTPAY_ID=  (deprecated — ไม่ใช้ใน Checkout แล้ว)
```

- [ ] **Step 3: Commit**

```bash
git add components/checkout/CheckoutScreen.tsx lib/promptPay.ts .env.example
git commit -m "feat(checkout): load PromptPay config from org_settings"
```

---

### Task 8: Scripts — `create-org` + `migrate-org-settings`

**Files:**
- Create: `scripts/create-org.mjs`
- Create: `scripts/migrate-org-settings.mjs`

**Interfaces:**
- Produces:
  - `node scripts/create-org.mjs <name> <slug> <owner-pin>` → org UUID + 4 tables + copy menu seed
  - `node scripts/migrate-org-settings.mjs` → อัปเดต default org จาก env

- [ ] **Step 1: `scripts/migrate-org-settings.mjs`**

```js
import { createClient } from '@supabase/supabase-js';
import { loadEnv, requireEnv } from './_env.mjs';

const DEFAULT_ORG = '00000000-0000-4000-8000-000000000001';
const env = loadEnv();
requireEnv(env, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const promptpay = (env.NEXT_PUBLIC_PROMPTPAY_ID ?? '').replace(/[^0-9]/g, '') || null;
const merchant = env.RECEIPT_MERCHANT_NAME?.trim() || 'YOKAYAKI';

const { error } = await db.from('org_settings').upsert({
  org_id: DEFAULT_ORG,
  promptpay_id: promptpay,
  receipt_merchant_name: merchant,
});

if (error) {
  console.error('อัปเดต org_settings ไม่สำเร็จ:', error.message);
  process.exit(1);
}
console.log('อัปเดต default org_settings สำเร็จ');
```

- [ ] **Step 2: `scripts/create-org.mjs`**

สคริปต์ service_role:
1. `INSERT organizations` + `org_settings`
2. `INSERT tables` 4 แถว (`table_number` 1–4, status vacant)
3. `admin_add_employee(name, pin, 'owner', orgId)`
4. copy `menu_items` จาก default org (SELECT แล้ว INSERT ด้วย org_id ใหม่)
5. print org UUID + owner employee id

- [ ] **Step 3: Commit**

```bash
git add scripts/create-org.mjs scripts/migrate-org-settings.mjs
git commit -m "feat(scripts): create-org and migrate-org-settings for M4"
```

---

### Task 9: Integration test — `tenant_isolation.sql`

**Files:**
- Create: `supabase/tests/tenant_isolation.sql`
- Modify: `supabase/tests/rls_policies.sql`
- Modify: `supabase/tests/security.sql`
- Modify: `supabase/tests/a7_audit.sql`
- Modify: `supabase/tests/checkout_promo.sql` (ถ้าอ้าง table id int)
- Modify: `supabase/tests/customer_session.sql`
- Modify: `supabase/tests/order_batch.sql`

**Interfaces:**
- Produces: assertion ข้าม org ถูกปฏิเสธ · seed ใส่ `org_id` ใน JWT claims

- [ ] **Step 1: helper lookup โต๊ะในเทสต์เดิม**

เพิ่มฟังก์ชันช่วยในไฟล์ที่ใช้บ่อย (หรือซ้ำในแต่ละไฟล์):

```sql
CREATE OR REPLACE FUNCTION public._test_table_uuid(p_org UUID, p_num INT)
RETURNS UUID LANGUAGE sql AS $$
  SELECT id FROM tables WHERE org_id = p_org AND table_number = p_num LIMIT 1;
$$;
```

แทน `place_order_item(1, ...)` ด้วย `place_order_item(public._test_table_uuid('00000000-0000-4000-8000-000000000001', 1), ...)`

- [ ] **Step 2: สร้าง `tenant_isolation.sql`**

```sql
\set ON_ERROR_STOP on
BEGIN;

-- org B
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-4000-8000-000000000002', 'ร้าน B', 'shop-b');
INSERT INTO org_settings (org_id) VALUES ('00000000-0000-4000-8000-000000000002');
INSERT INTO tables (id, org_id, table_number, status)
VALUES (gen_random_uuid(), '00000000-0000-4000-8000-000000000002', 1, 'vacant');

-- staff A JWT
PERFORM set_config('request.jwt.claims', json_build_object(
  'emp_id', 1, 'emp_name', 'A', 'emp_role', 'owner',
  'org_id', '00000000-0000-4000-8000-000000000001'
)::text, true);
SET ROLE authenticated;

-- เห็นแค่เมนู org A
DO $$
DECLARE v_b INT;
BEGIN
  SELECT COUNT(*) INTO v_b FROM menu_items WHERE org_id = '00000000-0000-4000-8000-000000000002';
  IF v_b > 0 THEN RAISE EXCEPTION 'M4 fail: staff A เห็นเมนู org B'; END IF;
END $$;

-- INSERT เมนู org B ต้องถูกปฏิเสธ
DO $$
BEGIN
  INSERT INTO menu_items (name, price, stock, org_id)
  VALUES ('แฮก', 1, 1, '00000000-0000-4000-8000-000000000002');
  RAISE EXCEPTION 'M4 fail: INSERT ข้าม org สำเร็จ';
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

-- place_order_batch โต๊ะ org B ต้อง error
DO $$
DECLARE v_tbl UUID;
BEGIN
  SELECT id INTO v_tbl FROM tables
  WHERE org_id = '00000000-0000-4000-8000-000000000002' AND table_number = 1;
  PERFORM public.place_order_batch(v_tbl, '[{"menu_item_id":1,"quantity":1}]'::jsonb);
  RAISE EXCEPTION 'M4 fail: สั่งเข้าโต๊ะ org B สำเร็จ';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%invalid_table%' AND SQLERRM NOT LIKE '%unauthorized%' THEN
    RAISE;
  END IF;
END $$;

RAISE NOTICE 'PASS M4 tenant_isolation';
ROLLBACK;
```

- [ ] **Step 3: อัปเดต `rls_policies.sql`**

- เพิ่ม `org_id` ใน `set_config('request.jwt.claims', ...)`
- แก้ `ON CONFLICT (phone_number)` → `ON CONFLICT (org_id, phone_number)`
- อัปเดต `expected_policies` ให้รวม `organizations`, `org_settings`, `staff_update` บน `tables`
- แก้ seed ใช้ `_test_table_uuid`

- [ ] **Step 4: รันเทสต์ทั้งชุด**

```bash
pnpm db:reset && pnpm db:test
```

Expected: `ผ่านครบทุกไฟล์`

- [ ] **Step 5: Commit**

```bash
git add supabase/tests/
git commit -m "test(db): M4 tenant isolation and update SQL tests for UUID tables"
```

---

### Task 10: Regen types + verification + ปิด milestone

**Files:**
- Modify: `lib/database.types.ts`
- Modify: `MODULES_MILESTONES.md`
- Modify: `docs/superpowers/specs/2026-09-06-m4-multi-tenancy-org-design.md` (สถานะ → implemented)

- [ ] **Step 1: regen database types**

```bash
pnpm db:types
# หรือ node scripts/gen-db-types.mjs ถ้า CLI ไม่พร้อม
```

- [ ] **Step 2: แก้ type errors จาก `Database` ใหม่**

รัน `pnpm typecheck` แล้วแก้ call sites (เช่น `tables.id` string, `loyalty_members` composite key)

- [ ] **Step 3: verification ครบชุด**

```bash
pnpm db:reset && pnpm db:test
pnpm test:unit
pnpm typecheck && pnpm build
node scripts/verify-lockdown.mjs
```

- [ ] **Step 4: อัปเดต `MODULES_MILESTONES.md`**

- M4 → 🟢 พร้อมหลักฐาน migration + `tenant_isolation.sql`
- Milestone ปัจจุบัน → M5
- Last Updated → วันที่ปิดงาน

- [ ] **Step 5: Commit**

```bash
git add lib/database.types.ts MODULES_MILESTONES.md docs/superpowers/specs/
git commit -m "chore: close M4 multi-tenancy milestone"
```

---

## Self-Review (spec coverage)

| Spec § | Task |
|---|---|
| §1 schema org + org_id | Task 1 |
| §2 JWT + RLS | Task 2, 3 |
| §3 tables UUID | Task 4 |
| §4 RPC guards | Task 5 |
| §5 app + config + scripts | Task 6, 7, 8 |
| §6 testing | Task 9, 10 |
| Exit: 2 org แยกกัน | Task 9 |
| Exit: backfill default org | Task 1 |
| Exit: org_settings แทน env | Task 7, 8 |
| Exit: customer QR scope | Task 5 (RPC) + Task 6 (customerSession) |

## ความเสี่ยงระหว่าง implement

- Migration `tables` UUID (Task 4) มักต้องปรับลำดับ DROP FK ตาม constraint จริง — รัน `db:reset` บ่อย
- `payments` composite FK กับ `loyalty_members` — `complete_checkout` ต้อง INSERT payment ด้วย `org_id` ที่ตรงสมาชิก
- เทสต์เดิม ~8 ไฟล์อ้าง `table_id` เป็น int — แก้พร้อม Task 9 ไม่ทิ้งท้าย
