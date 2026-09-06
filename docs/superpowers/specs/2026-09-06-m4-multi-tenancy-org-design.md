# Design: M4 — Multi-Tenancy (org-only)

วันที่: 2026-09-06  
สถานะ: draft · รอรีวิวก่อนทำ implementation plan  
Milestone: `M4 Multi-Tenancy`

## ปัญหา

ระบบปัจจุบันเป็น **single-tenant** — ไม่มี `org_id` / `branch_id` ในฐานข้อมูล · RLS ของ staff scope ทั้งระบบ (ร้านเดียว) · config ร้าน (PromptPay, ชื่อบน QR) อยู่ env/hardcode · `tables.id` เป็นเลขโต๊ะจริง (1–4)

ไม่สามารถมี 2 ร้านในฐานเดียวกันโดยไม่รั่วข้อมูลข้ามกัน — ไม่ผ่านเกณฑ์ SaaS

## เป้าหมาย (Exit Criteria M4)

1. มี **2 organizations** ในฐานเดียวกัน — staff ของ org A **อ่าน/เขียน** ข้อมูล org B ไม่ได้ (พิสูจน์ด้วย `supabase/tests/` integration)
2. ข้อมูล production เดิมถูก backfill เป็น **default org** โดยไม่สูญหาย
3. Config ร้านที่จำเป็นต่อ checkout (PromptPay ID, ชื่อบน QR) อ่านจาก **`org_settings`** ไม่ hardcode/env ต่อร้าน
4. Customer QR path ยังปลอดภัย — session scope ภายใน org ของโต๊ะนั้น

## นอกขอบเขต (รอบนี้ไม่ทำ)

- ตาราง `branches` / multi-branch จริง
- Supabase Auth / `auth.uid()` / `memberships` (ไป **M5**)
- Self-service สมัครร้าน / onboarding UI (ไป **M6**)
- Billing / feature gating
- VAT / logo / currency ใน `org_settings` (ไป M8/M9)
- ย้าย owner CRUD (menu/promo/stock) จาก client+RLS ไป API ทั้งหมด (ทำเมื่อสะดวก ไม่บล็อก M4)

## การตัดสินใจที่ล็อกแล้ว

| หัวข้อ | เลือก |
|---|---|
| ขอบเขต tenant | **`org_id` เท่านั้น** — 1 org = 1 ร้าน = 1 สาขาโดยนัย |
| โต๊ะ | Surrogate PK (UUID) + `table_number` + `UNIQUE(org_id, table_number)` |
| RLS / JWT | **`org_id` ใน JWT** ตอน login · `jwt_org_id()` ใน policy |
| สร้าง org | Migration backfill + **script** (org ที่ 2 สำหรับ test) · ไม่มี UI สมัคร |
| แนวทาง implement | **Phase 4a→4d** ใน M4 (ไม่ big-bang) |

## แนวทางที่เลือก

**Phase แบ่งชั้นใน M4** (ไม่ใช่ big-bang migration เดียว)

| Phase | เนื้อหา |
|---|---|
| **4a** | `organizations` · `org_settings` · `org_id` nullable → backfill default org → NOT NULL |
| **4b** | `jwt_org_id()` · JWT login เพิ่ม claim · RLS ใหม่ทุกตาราง |
| **4c** | Rewrite `tables` (UUID + `table_number`) · อัปเดต FK · RPC ตรวจ org |
| **4d** | App/UI · อ่าน `org_settings` · integration test 2 org · อัปเดต E2E ถ้าจำเป็น |

ทางเลือกที่ตัด: big-bang เดียว · schema คู่ขนาน · `branch_id` ตั้งแต่แรก

---

## §1 โมเดล tenant & schema

### ตารางใหม่

**`organizations`**
- `id` UUID PK DEFAULT `gen_random_uuid()`
- `name` TEXT NOT NULL
- `slug` TEXT UNIQUE NULL (สำหรับ script/admin ภายหลัง)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

**`org_settings`** (1:1 กับ org)
- `org_id` UUID PK REFERENCES organizations(id) ON DELETE RESTRICT
- `promptpay_id` TEXT NULL — แทน `NEXT_PUBLIC_PROMPTPAY_ID` ต่อร้าน
- `receipt_merchant_name` TEXT NOT NULL DEFAULT 'YOKAYAKI' — ชื่อใน EMVCo QR
- `timezone` TEXT NOT NULL DEFAULT 'Asia/Bangkok'

REVOKE/GRANT ตามแบบ M0 — ไม่มี grant ให้ `anon`

### ใส่ `org_id` ในตารางเดิม

| กลุ่ม | ตาราง |
|---|---|
| Master | `employees`, `menu_items`, `promotions`, `loyalty_members`, `tables` |
| Transaction | `orders`, `order_items`, `payments`, `payment_promotions`, `qr_sessions`, `void_logs`, `stock_logs`, `points_logs`, `purchase_orders`, `item_ingredients` |

**`loyalty_members`:** เปลี่ยนเป็น `PRIMARY KEY (org_id, phone_number)` — เบอร์เดียวกันข้าม org ได้ · อัปเดต FK จาก `payments.phone_number` ให้สอดคล้อง (composite หรือ denorm `org_id` บน payments — เลือก composite FK ถ้าเป็นไปได้)

**`pin_attempts`:** ไม่ใส่ `org_id` — lockout ต่อ IP/global ตามเดิม

### Default org (migration 4a)

1. สร้าง org ชื่อ `Yokayaki` ด้วย **UUID คงที่** ใน migration (เช่น `00000000-0000-4000-8000-000000000001`) เพื่ออ้างอิงใน script/test
2. `UPDATE` ทุกตารางที่มีข้อมูล → `org_id = default`
3. `employees.org_id` NOT NULL
4. Seed `org_settings` สำหรับ default org — `promptpay_id` / `receipt_merchant_name` จากค่าเริ่มต้น; หลัง deploy รัน script คัดลอกจาก env ถ้าต้องการ
5. `pnpm db:reset && pnpm db:test` ต้องผ่านหลังทุก phase

---

## §2 JWT + RLS

### Login

```
POST /api/auth/login
  → verify_pin() (service_role)
  → อ่าน employees.org_id
  → sign JWT: emp_id, emp_role, emp_name, org_id
```

อัปเดต `lib/authToken.ts` — `StaffClaims` + `signStaffToken` รวม `orgId: string`

### ฟังก์ชัน DB

```sql
CREATE OR REPLACE FUNCTION public.jwt_org_id() RETURNS UUID ...
-- อ่าน claim org_id จาก request.jwt.claims
-- ไม่มี claim → NULL → policy ปฏิเสธ
```

REVOKE จาก PUBLIC/anon · GRANT EXECUTE ให้ `authenticated` (เหมือน `jwt_emp_id`)

### RLS pattern

ทุกตารางที่มี `org_id`:

```sql
-- SELECT (staff)
USING (org_id = public.jwt_org_id() AND public.is_staff())

-- INSERT/UPDATE owner tables
WITH CHECK (org_id = public.jwt_org_id() AND public.is_owner())
```

กฎ:
- ห้าม `INSERT` แถวที่ `org_id <> jwt_org_id()`
- ไม่รับ `org_id` จาก client body เป็นแหล่งความจริง — derive จาก JWT (หรือจาก parent row ที่อยู่ใน org เดียวกันใน RPC)
- `service_role` routes ยัง bypass RLS — ต้อง derive org จาก staff JWT ใน `requireStaff()` / session

### Customer QR

- `qr_sessions.org_id` (denorm จาก `tables.org_id`)
- `/api/customer/[session_id]/*` — ตรวจ session valid + scope โต๊ะภายใน org ของ session
- ไม่เปิด RLS ให้ `anon`

---

## §3 Rewrite โต๊ะ + FK

### Schema `tables` หลัง migrate

| คอลัมน์ | หมายเหตุ |
|---|---|
| `id` | UUID PK |
| `org_id` | FK → organizations |
| `table_number` | INT — เลขที่แสดงใน UI |
| `status` | vacant / occupied / checking_out |
| `updated_at` | เหมือนเดิม |
| | `UNIQUE(org_id, table_number)` |

### ขั้นตอน migration (4c)

1. เพิ่ม `table_number`, `org_id`, คอลัมน์ UUID ชั่วคราว
2. Backfill: `table_number = id` เดิม (1–4), `org_id = default`
3. สร้าง mapping old int id → new UUID
4. อัปเดต `orders.table_id`, `qr_sessions.table_id`
5. สลับ PK เป็น UUID · drop int id เดิม
6. อัปเดต RPC ที่รับ `p_table_id` เป็น UUID

### App

- `tableId` ใน props/state: `string` (UUID)
- แสดง `table_number` ใน UI (ครัว, ใบเสร็จ, ผังโต๊ะ)
- Realtime: filter ด้วย org scope (JWT) — ไม่รับ event ข้าม org

---

## §4 RPC & Server Tier

ทุก RPC ที่แตะข้อมูล operational ต้อง **assert org**:

| RPC | การตรวจ |
|---|---|
| `place_order_batch` | `tables.id = p_table_id AND tables.org_id = jwt_org_id()` |
| `void_order_item` | order_item → order → org |
| `complete_checkout` | order → org |
| `customer_place_order_batch` | session → table → org (ไม่ใช้ JWT — ใช้ session scope) |
| `adjust_loyalty_points` | `loyalty_members.org_id` |
| `upsert_purchase_order` | PO + items ใน org |
| `admin_*` | ยัง `service_role` only — employee ที่สร้างต้องอยู่ใน org ที่ script ระบุ |

`verify_pin`: คืน `org_id` ใน result หรือให้ login route อ่านจาก `employees` หลัง verify (ไม่ต้องคืนใน verify_pin ถ้า login route query อยู่แล้ว)

**`admin_add_employee`:** เพิ่มพารามิเตอร์หรือบังคับ `org_id` จาก context ของ script (service_role) — พนักงานใหม่ผูก org ที่สร้าง

DROP overload เก่าหลังแก้ · `REVOKE EXECUTE FROM PUBLIC, anon` ทุกฟังก์ชันใหม่

---

## §5 App & Config

| ไฟล์/พื้นที่ | การเปลี่ยน |
|---|---|
| `lib/authToken.ts` | claim `org_id` |
| `app/api/auth/login/route.ts` | อ่าน `employees.org_id` · ใส่ใน JWT |
| `lib/promptPay.ts` | รับ `merchantName` จาก caller (ไม่ hardcode) |
| `CheckoutScreen` | โหลด `org_settings` (หรือ API ที่คืน promptpay + merchant name) |
| `TableMap`, `KitchenScreen`, POS, Checkout | `tableId: string` (UUID) · แสดง `table_number` |
| `.env.example` | ลบ/ลด `NEXT_PUBLIC_PROMPTPAY_ID` เป็นค่า fallback dev หรือ migrate ไป DB เท่านั้น |

**Fallback dev:** ถ้า `org_settings.promptpay_id` ว่าง → ซ่อนปุ่ม QR (พฤติกรรมเดิม A7.8) ไม่ fallback เบอร์ปลอม

### Script

- `scripts/create-org.mjs` — สร้าง org ที่ 2 + seed โต๊ะ/เมนูขั้นต่ำ + owner PIN (สำหรับ test/staging)
- `scripts/migrate-org-settings.mjs` — คัดลอก env → default org `org_settings` (รันครั้งเดียวหลัง deploy)

---

## §6 Testing & Verification

### Integration (`supabase/tests/`)

ไฟล์ใหม่ เช่น `tenant_isolation.sql`:

1. สร้าง org A, org B (ใน transaction)
2. Seed staff JWT context หรือใช้ `SET request.jwt.claims` แบบ `rls_policies.sql`
3. Staff A SELECT `menu_items` → เห็นเฉพาะ org A
4. Staff A INSERT ลง org B → ถูกปฏิเสธ
5. `place_order_batch` ด้วย table ของ org B ขณะ claim org A → error
6. Customer session org A สั่งเข้า table org B → ถูกปฏิเสธ

อัปเดตเทสต์เดิมที่อ้าง `tables.id` เป็น int 1–4

### คำสั่งยืนยัน

```bash
pnpm db:reset && pnpm db:test   # รวม assertion tenant ใหม่
pnpm test:unit
pnpm typecheck && pnpm build
node scripts/verify-lockdown.mjs  # ยังต้องผ่าน (anon ปิดเหมือนเดิม)
```

### E2E

- อัปเดต `e2e/full-flow.spec.ts` ถ้า table id เปลี่ยนเป็น UUID — หรือเลือกโต๊ะผ่าน UI แทน hardcode id

---

## Phase สรุป (implementation order)

```
4a  organizations + org_settings + org_id columns + backfill
4b  jwt_org_id + login claim + RLS rewrite
4c  tables UUID rewrite + FK + RPC org guards
4d  app + org_settings UI/API + scripts + tenant_isolation.sql
```

## ความเสี่ยงที่รับได้

- `tableId` เปลี่ยนเป็น UUID กระทบ type ทั้งแอป — ทำใน phase 4c+4d พร้อมกัน
- `loyalty_members` PK เปลี่ยน — ต้องแก้ FK/join ใน SalesHistory/Checkout
- M5 อาจเปลี่ยน `memberships` แทน `employees.org_id` — ออกแบบให้ `org_id` อยู่ที่ employee ได้จนกว่าจะ migrate auth

## อ้างอิง

- `MODULES_MILESTONES.md` § M4
- `PosRestuarantSass.md` §B (ปรับให้ org-only ไม่มี branch)
- `lib/authToken.ts` · `supabase/migrations/20260824_security_hardening.sql` (RLS ปัจจุบัน)
- `supabase/tests/rls_policies.sql` (แพทเทิร์น JWT claims ในเทสต์)
