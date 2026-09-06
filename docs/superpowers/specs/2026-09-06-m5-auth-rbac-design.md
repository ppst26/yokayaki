# Design: M5 — Auth & RBAC (Phased)

วันที่: 2026-09-06  
สถานะ: approved · **Phase 5a complete** (2026-09-06) · 5b/5c pending · implementation plan อยู่ที่ `docs/superpowers/plans/2026-09-06-m5-auth-rbac-implementation-plan.md`  
Milestone: `M5 Auth & RBAC`

## ปัญหา

หลัง M4 มี `org_id` ใน JWT และ RLS แยก tenant แล้ว แต่ authorization ยังเป็น **2 ระดับ** (`owner` / `staff`) · เช็คสิทธิ์แท็บด้วย `employee?.role === 'owner'` ฝั่ง client · RLS ใช้ `is_staff()` / `is_owner()` ที่ไม่แยก cashier / kitchen / accountant

ไม่ผ่านเกณฑ์ SaaS: ร้านต้องการแยกหน้าที่ (แคชเชียร์ / ครัว / บัญชี / ผู้จัดการ) และ identity ระดับองค์กร (Supabase Auth) ยังไม่มี

## เป้าหมาย (Exit Criteria M5 ทั้ง milestone)

1. **5 roles** บังคับที่ **RLS + RPC** — พิสูจน์ด้วย `supabase/tests/role_matrix.sql` (ไม่พึ่ง UI ซ่อนแท็บ)
2. **Supabase Auth** + `memberships` ผูก user ↔ org ↔ role (Phase 5b)
3. **Revoke session** ได้ + บันทึก login audit (Phase 5c)
4. ค่า `staff` หายจาก DB — migrate เป็น `cashier` แล้วไม่มี role เก่าเหลือ

## นอกขอบเขต (รอบนี้ไม่ทำ)

- Self-service สมัครร้าน / onboarding UI (M6)
- Billing / feature gating ตาม plan (M6)
- แก้ permission matrix ผ่าน UI (อนาคต — รอบนี้ hardcode ใน SQL helpers)
- SSO / OAuth providers (หลัง 5b ถ้าต้องการ)
- ย้าย owner CRUD ทั้งหมดไป API (ทำเมื่อสะดวก — ไม่บล็อก M5)
- เปลี่ยน PK `loyalty_members` เป็น surrogate (M9 PDPA)

## การตัดสินใจที่ล็อกแล้ว

| หัวข้อ | เลือก |
|---|---|
| แนวทาง implement | **Phased 5a→5b→5c** (ไม่ big-bang) |
| Permission model (5a) | **SQL role helpers** (`can_operate_pos()` ฯลฯ) — ไม่ใช้ตาราง `role_permissions` |
| Migrate `staff` | **`staff` → `cashier`** ใน migration |
| `cashier` scope | **เทียบเท่า `staff` วันนี้** — ผังโต๊ะ · สั่ง · เช็คบิล · ครัว · สมัครสมาชิกตอน checkout |
| Identity (5b) | Supabase Auth สำหรับ org-level · **PIN ยังเป็น shift login** จนกว่าจะตัดใน 5b |
| Tenant scope | ยัง **`org_id` เท่านั้น** (จาก M4) |

## แนวทางที่เลือก

| Phase | เนื้อหา | ยังใช้ PIN custom JWT? |
|---|---|---|
| **5a** | 5 roles · SQL helpers · RLS/RPC rewrite · UI tab gating · `lib/permissions.ts` | ✅ |
| **5b** | `memberships` · Supabase Auth login · ผูก `auth.users` ↔ employee | เริ่มแยก identity |
| **5c** | Session revoke · `login_audit` · owner force-logout | ✅ + Auth sessions |

ทางเลือกที่ตัด: ตาราง `role_permissions` (over-engineering) · UI gating อย่างเดียว (ไม่ผ่านเกณฑ์) · big-bang Auth+roles พร้อมกัน

---

## §1 Role enum & migration (Phase 5a)

### 5 roles

| Role | ความหมาย |
|---|---|
| `owner` | สิทธิ์เต็มใน org — รวมจัดการพนักงาน · กฎ owner คนสุดท้ายยังมี |
| `manager` | back-office เกือบเท่า owner (เมนู/โปร/สต็อก/CRM/ประวัติ/dashboard/พนักงาน) |
| `cashier` | ปฏิบัติการหน้าร้าน — **เทียบเท่า `staff` เดิม** |
| `kitchen` | KDS เท่านั้น — อ่าน/เสิร์ฟ/void รายการครัว |
| `accountant` | อ่านรายงาน — ประวัติขาย · payments · dashboard (ไม่สั่ง/ไม่แก้เมนู) |

### Schema migration

```sql
-- 1. แปลง role เก่า
UPDATE employees SET role = 'cashier' WHERE role = 'staff';

-- 2. เปลี่ยน CHECK constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check
  CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen', 'accountant'));
```

### JWT / TypeScript

- Claim `emp_role` รองรับ 5 ค่า
- อัปเดต: `lib/authToken.ts` · `AuthContext` · `employeeRoleSchema` · `admin_*` RPC validation
- `verifyStaffToken()` ปฏิเสธ `staff` และ role ที่ไม่รู้จัก

### Deprecate `is_staff()` / `is_owner()`

- อัปเดต implementation ให้ map ไป helper ใหม่ (หรือ DROP หลัง migrate policy ทั้งหมด)
- `is_staff()` เดิม = `owner OR staff` → แทนที่ด้วย helper ตาม matrix ไม่ใช้ชื่อเดิมใน policy ใหม่

---

## §2 SQL permission helpers (Phase 5a)

ทุก helper อ่าน `public.jwt_emp_role()` · `STABLE` · `REVOKE FROM PUBLIC, anon` · `GRANT TO authenticated, service_role`

| Helper | Roles ที่คืน TRUE |
|---|---|
| `can_operate_pos()` | owner, manager, cashier |
| `can_kitchen()` | owner, manager, cashier, kitchen |
| `can_read_sales()` | owner, manager, accountant |
| `can_write_catalog()` | owner, manager |
| `can_manage_stock()` | owner, manager |
| `can_manage_loyalty()` | owner, manager |
| `can_manage_employees()` | owner, manager |

Pattern RLS (ทุกตารางที่มี `org_id`):

```sql
USING (org_id = public.jwt_org_id() AND public.can_<action>())
WITH CHECK (org_id = public.jwt_org_id() AND public.can_<action>())
```

### RLS matrix รายตาราง

| ตาราง | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| `organizations`, `org_settings` | `can_operate_pos` ∪ `can_read_sales` ∪ `can_kitchen` (อ่าน config ร้าน) | — |
| `employees` | `can_manage_employees` (policy เดิม — ยังไม่มี GRANT SELECT ให้เห็น `pin_bcrypt`) | ผ่าน `admin_*` service_role เท่านั้น |
| `tables` | `can_operate_pos` ∪ `can_kitchen` | UPDATE สถานะ: `can_operate_pos` |
| `orders` | `can_operate_pos` ∪ `can_kitchen` | ผ่าน RPC |
| `order_items` | `can_operate_pos` ∪ `can_kitchen` | UPDATE (serve): `can_kitchen` |
| `menu_items` | `can_operate_pos` ∪ `can_write_catalog` ∪ `can_read_sales` | ALL: `can_write_catalog` |
| `promotions` | `can_operate_pos` ∪ `can_write_catalog` | ALL: `can_write_catalog` |
| `qr_sessions` | `can_operate_pos` | INSERT: `can_operate_pos` |
| `loyalty_members` | `can_operate_pos` ∪ `can_manage_loyalty` | INSERT: `can_operate_pos` · UPDATE/DELETE: `can_manage_loyalty` |
| `payments`, `payment_promotions`, `void_logs` | `can_read_sales` | — (เขียนผ่าน RPC) |
| `stock_logs`, `item_ingredients`, `purchase_orders` | `can_manage_stock` | ALL/INSERT ตามเดิม: `can_manage_stock` |
| `points_logs` | `can_manage_loyalty` | INSERT: `can_manage_loyalty` |

หมายเหตุ: `cashier` **ไม่**อ่าน `payments` โดยตรง (ต่างจาก `is_staff` เดิมที่อ่านได้) — ประวัติขายเป็นแท็บ owner/manager/accountant

### RPC guards (อัปเดตใน migration 5a)

| RPC | Guard |
|---|---|
| `place_order_batch`, `place_order_item` | `jwt_org_id()` + `can_operate_pos()` |
| `complete_checkout` | order → org + `can_operate_pos()` |
| `void_order_item` | order chain + `can_kitchen()` |
| `adjust_loyalty_points` | `can_manage_loyalty()` |
| `upsert_purchase_order` | `can_manage_stock()` |
| `customer_place_order_*` | ไม่เปลี่ยน — session scope (service_role) |

`admin_*` ยัง `service_role` only · validate role ใหม่ใน `admin_add_employee` / `admin_update_employee`

---

## §3 App & UI (Phase 5a)

### `lib/permissions.ts`

Mirror helper ฝั่ง client (ซ่อนแท็บเท่านั้น — **ไม่ใช่แหล่งความจริง**):

```ts
export type EmployeeRole = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'accountant';

export function canAccessTab(role: EmployeeRole, tab: NavTab): boolean;
```

### Tab matrix

| แท็บ (`NavTab`) | Roles |
|---|---|
| `floor` | operate_pos |
| `kitchen` | kitchen |
| `history` | read_sales |
| `stock` | manage_stock |
| `menu`, `promo` | write_catalog |
| `dashboard` | read_sales |
| `loyalty` | manage_loyalty |
| `employees` | manage_employees |

### ไฟล์ที่แก้

| ไฟล์ | การเปลี่ยน |
|---|---|
| `components/common/SidebarNav.tsx` | `canAccessTab` แทน `isOwner` |
| `components/common/TableMap.tsx` | gate แท็บ back-office |
| `components/EmployeeManager.tsx` | dropdown 5 roles |
| `lib/api/schemas.ts` | `employeeRoleSchema` 5 ค่า |
| `app/api/employees/route.ts` | ส่ง role ใหม่ไป `admin_add_employee` |

### API routes

- Routes ที่ใช้ `requireOwner()` → เปลี่ยนเป็น `requireRole(...)` หรือ helper ตาม matrix (เช่น employee CRUD = manage_employees)
- Routes operational (`/api/orders`, `/api/checkout`, `/api/kitchen/*`) — ตรวจ role สอดคล้อง RPC (หรือพึ่ง RPC guard อย่างเดียวถ้าใช้ `requireStaffSupabase`)

---

## §4 Phase 5b — Supabase Auth + memberships

### ตารางใหม่

**`memberships`**
- `id` UUID PK
- `auth_user_id` UUID NOT NULL REFERENCES `auth.users(id)` ON DELETE CASCADE
- `org_id` UUID NOT NULL REFERENCES `organizations(id)` ON DELETE RESTRICT
- `employee_id` INT NULL REFERENCES `employees(id)` ON DELETE SET NULL
- `role` TEXT NOT NULL CHECK (role IN (...5 roles...))
- `created_at` TIMESTAMPTZ
- `UNIQUE(auth_user_id, org_id)`

**`employees`** — เพิ่ม `auth_user_id` UUID NULL (optional ช่วงเปลี่ยนผ่าน)

### Login flow (เป้าหมาย)

```
1. Supabase Auth signIn (email/password) — org owner/manager ครั้งแรก
2. เลือก org (ถ้ามีหลาย membership) หรือ derive จาก membership เดียว
3. PIN shift login (verify_pin) — ผูกกับ employee ใน org นั้น
4. signStaffToken: emp_id, emp_role, emp_name, org_id, sub (auth user id)
```

### RLS หลัง 5b

- ค่อยๆ ผูก audit กับ `auth.uid()` ผ่าน `memberships`
- ยังคง `jwt_emp_id()` สำหรับ operational audit จนกว่าจะ migrate void_logs ฯลฯ

### นอกขอบเขต 5b

- ลบ PIN ทิ้งทั้งหมด (ยังเป็น shift layer)
- Magic link / SSO

---

## §5 Phase 5c — Session revoke & audit

### ตารางใหม่

**`staff_sessions`**
- `id` UUID PK
- `employee_id` INT NOT NULL
- `org_id` UUID NOT NULL
- `issued_at`, `expires_at`, `revoked_at` NULL
- `device_hint` TEXT NULL (จาก user-agent ฝั่ง server)

**`login_audit`**
- `id` BIGSERIAL PK
- `employee_id` INT
- `org_id` UUID
- `event` TEXT — `login_success` | `login_fail` | `logout` | `revoke`
- `ip_hint` TEXT
- `created_at` TIMESTAMPTZ

### API

- `POST /api/auth/logout` — mark session revoked
- `POST /api/auth/sessions/[id]/revoke` — owner/manager revoke session อื่น
- JWT ตรวจ `session_id` claim กับ `staff_sessions` (ไม่ revoked)

---

## §6 Testing & verification

### Integration (`supabase/tests/`)

**`role_matrix.sql`** (ใหม่):
1. Seed พนักงาน 5 roles ใน org เดียว (transaction)
2. `SET request.jwt.claims` ต่อ role
3. Assert SELECT/INSERT/UPDATE ตาม matrix (เช่น `kitchen` SELECT `order_items` = rows · INSERT `menu_items` = denied)
4. Assert RPC: `cashier` → `place_order_batch` ok · `kitchen` → denied · `accountant` → `complete_checkout` denied

อัปเดต `rls_policies.sql`:
- บัญชี `expected_policies` ถ้าเปลี่ยนชื่อ policy
- JWT claims ใช้ `cashier` แทน `staff`

### คำสั่งยืนยัน (ทุก phase)

```bash
pnpm db:reset && pnpm db:test
pnpm test:unit
pnpm typecheck && pnpm build
node scripts/verify-lockdown.mjs
```

---

## Phase สรุป (implementation order)

```
5a  role enum + helpers + RLS/RPC + UI permissions + role_matrix.sql
5b  memberships + Supabase Auth login path + link employees
5c  staff_sessions + login_audit + revoke API
```

## ความเสี่ยงที่รับได้

- `cashier` ไม่อ่าน `payments` โดยตรง — ต่างจาก `staff` เดิม; ถ้าร้านต้องการให้แคชเชียร์ดูประวัติ ต้อง promote เป็น manager/accountant
- Phase 5b อาจต้อง login สองขั้น (Auth + PIN) ช่วงเปลี่ยนผ่าน — ต้องออกแบบ UX ใน implementation plan
- `employees` ยังไม่มี SELECT grant — EmployeeManager ยังผ่าน API `admin_list_employees`

## อ้างอิง

- `MODULES_MILESTONES.md` § M5
- `PosRestuarantSass.md` §C
- `docs/superpowers/specs/2026-09-06-m4-multi-tenancy-org-design.md`
- `supabase/migrations/20260907_m4_jwt_org_rls.sql`
- `supabase/migrations/20260824_security_hardening.sql` (`is_staff` / `is_owner`)
