# M5 Auth & RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ขยาย authorization เป็น 5 roles บังคับที่ RLS/RPC · ตามด้วย Supabase Auth + memberships · ปิดด้วย session revoke และ login audit

**Architecture:** Phase **5a** — SQL `can_*()` helpers + migrate `staff→cashier` + RLS/RPC/UI · **5b** — `memberships` + Auth email login ก่อน PIN · **5c** — `staff_sessions` + `session_id` ใน JWT + revoke API

**Tech Stack:** PostgreSQL migrations, Supabase RLS + Auth, Next.js 16 App Router, `jose` JWT, Vitest, Playwright E2E

**Spec:** `docs/superpowers/specs/2026-09-06-m5-auth-rbac-design.md` (อนุมัติแล้ว)

## Global Constraints

- Tenant scope ยัง **`org_id` เท่านั้น** (จาก M4) — ทุก policy ยังมี `org_id = jwt_org_id()`
- Permission matrix ใน **SQL helpers** — ไม่สร้างตาราง `role_permissions` ใน M5
- Migrate **`staff` → `cashier`** — ห้ามเหลือ role `staff` ใน DB/JWT หลัง 5a
- `cashier` = สิทธิ์เดิมของ `staff` (รวมครัว) · **ไม่**อ่าน `payments` โดยตรง
- ห้าม policy/grant ให้ `anon` · ฟังก์ชันใหม่ **`REVOKE EXECUTE FROM PUBLIC, anon`**
- ใช้ `pnpm` เท่านั้น · หลังทุก migration: `pnpm db:reset && pnpm db:test`
- อย่า commit `.env.local` หรือ secrets

## Constants

```sql
\set default_org '00000000-0000-4000-8000-000000000001'
```

```ts
export const EMPLOYEE_ROLES = ['owner', 'manager', 'cashier', 'kitchen', 'accountant'] as const;
```

## File map

| ไฟล์ | Phase | หน้าที่ |
|---|---|---|
| `supabase/migrations/20260911_m5_roles_enum.sql` | 5a | `staff→cashier` + CHECK 5 roles + `admin_*` validation |
| `supabase/migrations/20260912_m5_permission_helpers.sql` | 5a | `can_operate_pos()` … `can_manage_employees()` |
| `supabase/migrations/20260913_m5_rls_role_matrix.sql` | 5a | rewrite policies ใช้ `can_*()` |
| `supabase/migrations/20260914_m5_rpc_role_guards.sql` | 5a | RPC ตรวจ role |
| `lib/permissions.ts` | 5a | client tab gating (mirror matrix) |
| `lib/permissions.test.ts` | 5a | unit tests matrix |
| `lib/authToken.ts` | 5a/5c | 5 roles · `sessionId` claim (5c) |
| `lib/session.ts` | 5a/5c | `requireManageEmployees()` · session revoke check |
| `components/common/SidebarNav.tsx` | 5a | `canAccessTab` |
| `components/common/TableMap.tsx` | 5a | gate back-office tabs |
| `components/EmployeeManager.tsx` | 5a | dropdown 5 roles |
| `supabase/tests/role_matrix.sql` | 5a | integration ทุก role |
| `supabase/migrations/20260915_m5_memberships.sql` | 5b | `memberships` + `employees.auth_user_id` |
| `app/api/auth/org-login/route.ts` | 5b | Supabase Auth email/password |
| `app/api/auth/login/route.ts` | 5b | PIN ต้องมี org auth cookie ก่อน |
| `scripts/link-owner-auth.mjs` | 5b | ผูก owner คนแรกกับ auth user |
| `supabase/migrations/20260916_m5_staff_sessions.sql` | 5c | `staff_sessions` + `login_audit` |
| `app/api/auth/sessions/[id]/revoke/route.ts` | 5c | manager/owner revoke |
| `MODULES_MILESTONES.md` | 5c | ปิด M5 |

---

### Task 1: Migration 5a — role enum (`staff` → `cashier`)

**Files:**
- Create: `supabase/migrations/20260911_m5_roles_enum.sql`

**Interfaces:**
- Produces: `employees.role` CHECK 5 ค่า · ไม่มีแถว `staff` · `admin_add_employee` / `admin_update_employee` รับ role ใหม่

- [ ] **Step 1: สร้าง migration**

```sql
BEGIN;

UPDATE public.employees SET role = 'cashier' WHERE role = 'staff';

ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check
  CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen', 'accountant'));

-- อัปเดต admin_add_employee / admin_update_employee (copy body จาก 20260909 แล้วแก้บรรทัด role check)
-- เปลี่ยนทุก: IF p_role NOT IN ('owner', 'staff')
-- เป็น:     IF p_role NOT IN ('owner', 'manager', 'cashier', 'kitchen', 'accountant')

-- admin_update_employee: กันลด owner คนสุดท้าย — เปลี่ยนเงื่อนไข p_role = 'staff'
-- เป็น: p_role NOT IN ('owner', 'manager') เมื่อ v_current_role = 'owner'

REVOKE EXECUTE ON FUNCTION public.admin_add_employee(TEXT,TEXT,TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_employee(TEXT,TEXT,TEXT,UUID) TO service_role;

COMMIT;
```

- [ ] **Step 2: `pnpm db:reset`**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260911_m5_roles_enum.sql
git commit -m "feat(db): M5 5a migrate staff to cashier and five roles"
```

---

### Task 2: Migration 5a — permission helpers

**Files:**
- Create: `supabase/migrations/20260912_m5_permission_helpers.sql`

**Interfaces:**
- Produces: `can_operate_pos()`, `can_kitchen()`, `can_read_sales()`, `can_write_catalog()`, `can_manage_stock()`, `can_manage_loyalty()`, `can_manage_employees()`, `can_read_org_settings()`

- [ ] **Step 1: สร้าง helpers**

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.can_operate_pos() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager', 'cashier');
$$;

CREATE OR REPLACE FUNCTION public.can_kitchen() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager', 'cashier', 'kitchen');
$$;

CREATE OR REPLACE FUNCTION public.can_read_sales() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager', 'accountant');
$$;

CREATE OR REPLACE FUNCTION public.can_write_catalog() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_stock() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_loyalty() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_employees() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.can_read_org_settings() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.can_operate_pos() OR public.can_read_sales() OR public.can_kitchen();
$$;

REVOKE EXECUTE ON FUNCTION
  public.can_operate_pos(), public.can_kitchen(), public.can_read_sales(),
  public.can_write_catalog(), public.can_manage_stock(), public.can_manage_loyalty(),
  public.can_manage_employees(), public.can_read_org_settings()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.can_operate_pos(), public.can_kitchen(), public.can_read_sales(),
  public.can_write_catalog(), public.can_manage_stock(), public.can_manage_loyalty(),
  public.can_manage_employees(), public.can_read_org_settings()
TO authenticated, service_role;

-- อัปเดต is_staff / is_owner ให้ delegate (ช่วงเปลี่ยนผ่าน — tests เก่าอาจเรียก)
CREATE OR REPLACE FUNCTION public.is_staff() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.can_operate_pos() OR public.can_kitchen() OR public.can_read_sales();
$$;

CREATE OR REPLACE FUNCTION public.is_owner() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager');
$$;

COMMIT;
```

- [ ] **Step 2: `pnpm db:reset` · Commit** `feat(db): M5 permission helper functions`

---

### Task 3: Migration 5a — RLS rewrite

**Files:**
- Create: `supabase/migrations/20260913_m5_rls_role_matrix.sql`

**Interfaces:**
- Consumes: helpers จาก Task 2
- Produces: policies ใหม่ทุกตารางตาม spec §2

- [ ] **Step 1: DROP policies เก่า + CREATE ใหม่**

ตัวอย่าง pattern (ทำครบทุกตารางใน `20260907_m4_jwt_org_rls.sql`):

```sql
-- tables SELECT
CREATE POLICY pos_read_tables ON public.tables
  FOR SELECT TO authenticated
  USING (org_id = jwt_org_id() AND (can_operate_pos() OR can_kitchen()));

CREATE POLICY pos_update_tables ON public.tables
  FOR UPDATE TO authenticated
  USING (org_id = jwt_org_id() AND can_operate_pos())
  WITH CHECK (org_id = jwt_org_id() AND can_operate_pos());

-- payments — เฉพาะ can_read_sales (cashier อ่านไม่ได้)
CREATE POLICY sales_read_payments ON public.payments
  FOR SELECT TO authenticated
  USING (org_id = jwt_org_id() AND can_read_sales());

-- menu_items SELECT — operate + catalog write + read_sales (accountant อ่านเมนูในรายงาน)
CREATE POLICY read_menu_items ON public.menu_items
  FOR SELECT TO authenticated
  USING (org_id = jwt_org_id() AND (can_operate_pos() OR can_write_catalog() OR can_read_sales()));

CREATE POLICY write_menu_items ON public.menu_items
  FOR ALL TO authenticated
  USING (org_id = jwt_org_id() AND can_write_catalog())
  WITH CHECK (org_id = jwt_org_id() AND can_write_catalog());

-- org_settings
CREATE POLICY read_org_settings ON public.org_settings
  FOR SELECT TO authenticated
  USING (org_id = jwt_org_id() AND can_read_org_settings());
```

ลบ policy ชื่อเดิม (`staff_read`, `owner_write`, …) ก่อนสร้างใหม่

- [ ] **Step 2: `pnpm db:reset` · Commit** `feat(db): M5 RLS role matrix policies`

---

### Task 4: Migration 5a — RPC role guards

**Files:**
- Create: `supabase/migrations/20260914_m5_rpc_role_guards.sql`

**Interfaces:**
- Consumes: `can_*()` helpers

- [ ] **Step 1: แก้หัว RPC**

ใน `place_order_batch` / `place_order_item` หลัง `jwt_org_id()` check:

```sql
IF NOT public.can_operate_pos() THEN
  RAISE EXCEPTION 'forbidden_role';
END IF;
```

`complete_checkout` — เพิ่ม `can_operate_pos()` (fail-closed)

`void_order_item` — เปลี่ยนเป็น `can_kitchen()`

`adjust_loyalty_points` — `can_manage_loyalty()`

`upsert_purchase_order` — `can_manage_stock()`

- [ ] **Step 2: `pnpm db:reset` · Commit** `feat(db): M5 RPC role guards`

---

### Task 5: `lib/permissions.ts` + auth types (TDD)

**Files:**
- Create: `lib/permissions.ts`
- Create: `lib/permissions.test.ts`
- Modify: `lib/authToken.ts`
- Modify: `lib/api/schemas.ts`

**Interfaces:**
- Produces:
  - `EmployeeRole` union 5 ค่า
  - `canAccessTab(role, tab): boolean`
  - `verifyStaffToken` ปฏิเสธ `staff`

- [ ] **Step 1: เขียน failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { canAccessTab } from '@/lib/permissions';

describe('canAccessTab', () => {
  it('cashier เห็น floor และ kitchen ไม่เห็น history', () => {
    expect(canAccessTab('cashier', 'floor')).toBe(true);
    expect(canAccessTab('cashier', 'kitchen')).toBe(true);
    expect(canAccessTab('cashier', 'history')).toBe(false);
  });

  it('accountant เห็น history/dashboard ไม่เห็น floor', () => {
    expect(canAccessTab('accountant', 'history')).toBe(true);
    expect(canAccessTab('accountant', 'dashboard')).toBe(true);
    expect(canAccessTab('accountant', 'floor')).toBe(false);
  });

  it('kitchen เห็นแค่ kitchen', () => {
    expect(canAccessTab('kitchen', 'kitchen')).toBe(true);
    expect(canAccessTab('kitchen', 'floor')).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `lib/permissions.ts`**

```ts
import type { NavTab } from '@/components/common/SidebarNav';

export type EmployeeRole = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'accountant';

const TAB_MATRIX: Record<NavTab, EmployeeRole[]> = {
  floor: ['owner', 'manager', 'cashier'],
  kitchen: ['owner', 'manager', 'cashier', 'kitchen'],
  history: ['owner', 'manager', 'accountant'],
  stock: ['owner', 'manager'],
  menu: ['owner', 'manager'],
  promo: ['owner', 'manager'],
  dashboard: ['owner', 'manager', 'accountant'],
  loyalty: ['owner', 'manager'],
  employees: ['owner', 'manager'],
};

export function canAccessTab(role: EmployeeRole, tab: NavTab): boolean {
  return TAB_MATRIX[tab]?.includes(role) ?? false;
}
```

- [ ] **Step 3: อัปเดต `lib/authToken.ts`**

```ts
export type EmployeeRole = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'accountant';

const VALID_ROLES: EmployeeRole[] = ['owner', 'manager', 'cashier', 'kitchen', 'accountant'];

// verifyStaffToken:
if (!VALID_ROLES.includes(empRole as EmployeeRole)) return null;
```

- [ ] **Step 4: `employeeRoleSchema` ใน `lib/api/schemas.ts`**

```ts
export const employeeRoleSchema = z.enum(
  ['owner', 'manager', 'cashier', 'kitchen', 'accountant'],
  { message: 'ตำแหน่งไม่ถูกต้อง' }
);
```

- [ ] **Step 5: `pnpm test:unit lib/permissions.test.ts` · `pnpm typecheck` · Commit**

---

### Task 6: UI tab gating + EmployeeManager

**Files:**
- Modify: `components/common/SidebarNav.tsx`
- Modify: `components/common/TableMap.tsx`
- Modify: `components/EmployeeManager.tsx`
- Modify: `context/AuthContext.tsx`

- [ ] **Step 1: SidebarNav — แทน `isOwner`**

```tsx
import { canAccessTab, type EmployeeRole } from '@/lib/permissions';

const role = (employee?.role ?? 'cashier') as EmployeeRole;

// แทน isOwner && <Tab history />
{canAccessTab(role, 'history') && ( ... )}
```

ทำครบทุกแท็บ owner-only

- [ ] **Step 2: TableMap — default tab ตาม role**

```tsx
useEffect(() => {
  if (!employee) return;
  const role = employee.role as EmployeeRole;
  if (role === 'kitchen') setActiveTab('kitchen');
  else if (role === 'accountant') setActiveTab('history');
  else setActiveTab('floor');
}, [employee?.id]);
```

- [ ] **Step 3: EmployeeManager — dropdown 5 roles + label ไทย**

- [ ] **Step 4: `pnpm typecheck && pnpm build` · Commit** `feat(ui): M5 role-based tab gating`

---

### Task 7: API `requireManageEmployees` + employee routes

**Files:**
- Modify: `lib/session.ts`
- Modify: `app/api/employees/route.ts`
- Modify: `app/api/employees/[id]/route.ts`

- [ ] **Step 1: เพิ่ม helper**

```ts
import type { EmployeeRole } from '@/lib/permissions';

const MANAGE_EMPLOYEES: EmployeeRole[] = ['owner', 'manager'];

export async function requireManageEmployees(): Promise<StaffClaims> {
  const session = await requireStaff();
  if (!MANAGE_EMPLOYEES.includes(session.empRole as EmployeeRole)) {
    throw new HttpError(403, 'ต้องใช้สิทธิ์ผู้จัดการหรือเจ้าของร้าน');
  }
  return session;
}
```

- [ ] **Step 2: แทน `requireOwner()` ใน employee routes**

- [ ] **Step 3: Commit** `feat(api): allow manager role for employee CRUD`

---

### Task 8: Integration test `role_matrix.sql` + อัปเดตเทสต์เดิม

**Files:**
- Create: `supabase/tests/role_matrix.sql`
- Modify: `supabase/tests/rls_policies.sql`
- Modify: `supabase/tests/a7_audit.sql`
- Modify: `supabase/tests/employees_rpc.sql`
- Modify: `supabase/tests/security.sql` (ถ้าอ้าง `staff`)

- [ ] **Step 1: สร้าง `role_matrix.sql`**

```sql
\set ON_ERROR_STOP on
BEGIN;

-- helper ตั้ง JWT
CREATE OR REPLACE FUNCTION pg_temp.set_role(p_role TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object(
    'emp_id', 99, 'emp_name', 'ทดสอบ', 'emp_role', p_role,
    'org_id', '00000000-0000-4000-8000-000000000001'
  )::text, true);
END; $$;

-- kitchen: อ่าน order_items ได้ · อ่าน payments ไม่ได้
PERFORM pg_temp.set_role('kitchen');
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_n INT;
BEGIN
  SELECT COUNT(*) INTO v_n FROM order_items;
  IF v_n = 0 THEN RAISE EXCEPTION 'kitchen ต้องเห็น order_items'; END IF;
  BEGIN
    PERFORM COUNT(*) FROM payments;
    RAISE EXCEPTION 'kitchen ต้องไม่เห็น payments';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- cashier: place_order_batch ผ่าน (ใช้ table UUID helper จาก rls_policies)
PERFORM pg_temp.set_role('cashier');
-- ... PERFORM place_order_batch ...

-- accountant: SELECT payments ok · INSERT menu_items denied
PERFORM pg_temp.set_role('accountant');
-- ...

RESET ROLE;
RAISE NOTICE 'PASS M5 role_matrix';
ROLLBACK;
```

- [ ] **Step 2: อัปเดต `rls_policies.sql`**

- เปลี่ยน JWT claim `emp_role: staff` → `cashier`
- อัปเดต `expected_policies` ให้ตรงชื่อ policy ใหม่จาก Task 3
- ปรับเมทริกซ์ทดสอบ: staff JWT อ่าน `payments` ต้องเป็น `denied` หรือ `zero`

- [ ] **Step 3: `employees_rpc.sql` — แทน `'staff'` ด้วย `'cashier'` ทุกจุด**

- [ ] **Step 4: `pnpm db:reset && pnpm db:test` — ต้องผ่านทุกไฟล์**

- [ ] **Step 5: Commit** `test(db): M5 role matrix and update SQL tests`

---

### Task 9: Phase 5a closure — types + milestone partial

**Files:**
- Modify: `lib/database.types.ts`
- Modify: `MODULES_MILESTONES.md`
- Modify: `docs/superpowers/specs/2026-09-06-m5-auth-rbac-design.md`

- [ ] **Step 1: `pnpm db:types` (หรือ `node scripts/gen-db-types.mjs`)**

- [ ] **Step 2: Verification**

```bash
pnpm db:reset && pnpm db:test
pnpm test:unit
pnpm typecheck && pnpm build
node scripts/verify-lockdown.mjs
```

- [ ] **Step 3: `MODULES_MILESTONES.md` — บันทึก M5 5a 🟢 (ยังไม่ปิด M5 ทั้ง milestone)**

- [ ] **Step 4: Commit** `chore: complete M5 phase 5a role matrix`

---

### Task 10: Migration 5b — `memberships`

**Files:**
- Create: `supabase/migrations/20260915_m5_memberships.sql`

**Interfaces:**
- Produces: `memberships` table · `employees.auth_user_id` nullable UUID

- [ ] **Step 1: Migration**

```sql
BEGIN;

CREATE TABLE public.memberships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID NOT NULL,
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  employee_id   INT REFERENCES public.employees(id) ON DELETE SET NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner','manager','cashier','kitchen','accountant')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id, org_id)
);

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS auth_user_id UUID;

REVOKE ALL ON public.memberships FROM anon, authenticated;
-- ไม่เปิด RLS read ให้ client — จัดการผ่าน API service_role

COMMIT;
```

หมายเหตุ: ไม่มี FK ไป `auth.users` ใน docker test — ใช้ UUID คงที่ในเทสต์

- [ ] **Step 2: `pnpm db:reset` · Commit**

---

### Task 11: Phase 5b — Supabase Auth org login + PIN gate

**Files:**
- Create: `app/api/auth/org-login/route.ts`
- Create: `lib/orgAuthCookie.ts` (cookie `yk_org_auth` เก็บ auth user id + org_id)
- Modify: `app/api/auth/login/route.ts`
- Create: `scripts/link-owner-auth.mjs`
- Modify: `.env.example`

**Interfaces:**
- Produces: two-step login — org-login แล้วค่อย PIN

- [ ] **Step 1: `org-login` route**

```ts
// POST { email, password }
// supabaseAdmin.auth.signInWithPassword (หรือ createClient service role admin API)
// ตรวจ memberships ว่ามี org ที่ active
// Set httpOnly cookie yk_org_auth = { authUserId, orgId } (signed หรือ encrypted)
```

- [ ] **Step 2: แก้ PIN login**

```ts
// อ่าน yk_org_auth cookie — ถ้าไม่มี return 401 'กรุณาเข้าสู่ระบบองค์กรก่อน'
// verify_pin แล้วตรวจ employees.org_id = cookie.orgId
// ตรวจ employees.auth_user_id = cookie.authUserId OR NULL (ช่วงเปลี่ยนผ่าน อนุญาตถ้ายังไม่ link)
```

- [ ] **Step 3: `scripts/link-owner-auth.mjs`**

```bash
node scripts/link-owner-auth.mjs <employee_id> <auth_user_uuid>
# UPDATE employees SET auth_user_id = ... ; INSERT memberships ...
```

- [ ] **Step 4: UI — หน้า login สองขั้น (email/password แล้ว PinPad) หรือ modal ก่อน PinPad**

- [ ] **Step 5: Commit** `feat(auth): M5 Supabase Auth org login before PIN`

---

### Task 12: Phase 5c — sessions + revoke

**Files:**
- Create: `supabase/migrations/20260916_m5_staff_sessions.sql`
- Modify: `lib/authToken.ts`
- Modify: `app/api/auth/login/route.ts`
- Modify: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/sessions/[id]/revoke/route.ts`
- Modify: `lib/session.ts`

- [ ] **Step 1: Migration**

```sql
CREATE TABLE public.staff_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  device_hint  TEXT
);

CREATE TABLE public.login_audit (
  id           BIGSERIAL PRIMARY KEY,
  employee_id  INT,
  org_id       UUID,
  event        TEXT NOT NULL CHECK (event IN ('login_success','login_fail','logout','revoke')),
  ip_hint      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON public.staff_sessions, public.login_audit FROM anon, authenticated;
```

- [ ] **Step 2: Login สร้าง `staff_sessions` row + ใส่ `session_id` ใน JWT**

```ts
export interface StaffClaims {
  // ...
  sessionId: string;
}
```

- [ ] **Step 3: `getStaffSession` ตรวจ revoked**

```ts
// หลัง verifyStaffToken — query staff_sessions WHERE id = sessionId AND revoked_at IS NULL
```

- [ ] **Step 4: Logout mark `revoked_at` + audit · revoke route สำหรับ manager/owner**

- [ ] **Step 5: `supabase/tests/staff_sessions.sql` — revoke แล้ว JWT ใช้ไม่ได้**

- [ ] **Step 6: ปิด M5 ใน `MODULES_MILESTONES.md` · Commit** `feat(auth): M5 session revoke and login audit`

---

## Self-Review (spec coverage)

| Spec § | Task |
|---|---|
| §1 role enum + staff→cashier | Task 1, 5 |
| §2 SQL helpers + RLS matrix | Task 2, 3 |
| §2 RPC guards | Task 4 |
| §3 UI permissions | Task 5, 6, 7 |
| §4 memberships + Auth | Task 10, 11 |
| §5 sessions + audit | Task 12 |
| §6 role_matrix.sql | Task 8 |
| Exit: 5 roles at RLS | Task 3, 8 |
| Exit: Supabase Auth | Task 11 |
| Exit: revoke session | Task 12 |

## ความเสี่ยงระหว่าง implement

- เปลี่ยนชื่อ policy ทั้งชุด → ต้องอัปเดต `rls_policies.sql` พร้อม Task 3
- Login สองขั้น (5b) กระทบ E2E — เพิ่ม env `E2E_ORG_EMAIL` / `E2E_ORG_PASSWORD` หรือ bypass dev-only flag
- Production ต้องรัน `link-owner-auth.mjs` ก่อน enforce org cookie
