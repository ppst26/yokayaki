<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 📋 Yokayaki POS — Project Context

> **อ่านไฟล์นี้ทุกครั้งก่อนเริ่มทำงาน** — ไฟล์นี้คือ "แผนที่" ของโปรเจกต์ทั้งหมด
>
> สำหรับบุคลิก Agent, Architecture Understanding, และกฎการพัฒนา → อ่านต่อที่ [`agent/rules/main.md`](agent/rules/main.md)
> สำหรับ Communication Rules และ Naming Conventions → อ่านต่อที่ [`agent/rules/setting.md`](agent/rules/setting.md)
> สำหรับ Roadmap และสถานะฟีเจอร์ → อ่านต่อที่ [`ROADMAP.md`](ROADMAP.md)

---

## 🔧 Tech Stack (เจาะจงเวอร์ชัน)

| เทคโนโลยี | เวอร์ชัน | หมายเหตุ |
|-----------|---------|----------|
| **Next.js** | `16.2.10` | App Router, Turbopack dev server |
| **React** | `19.2.4` | Server Components support |
| **TypeScript** | `^5` | Strict mode enabled |
| **Supabase JS** | `^2.110.0` | Database + Realtime + RPC |
| **TailwindCSS** | `^4` | PostCSS plugin (`@tailwindcss/postcss`) |
| **Lucide React** | `^1.23.0` | Icon library |
| **react-qr-code** | `^2.2.0` | QR Code generation |
| **pnpm** | `10.11.0` | Package manager (ห้ามใช้ npm/yarn) |
| **Node.js** | ตาม Next.js 16 requirement | — |

---

## 📁 Directory Structure

```
yokayaki/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    #   Root Layout + AuthProvider wrapper
│   ├── page.tsx                      #   Landing: PinPad → TableMap switcher
│   ├── globals.css                   #   Global styles (Tailwind import)
│   ├── customer/
│   │   └── [session_id]/
│   │       └── page.tsx              #   Customer QR Portal (ไม่มี supabase client — เรียก /api/customer/* เท่านั้น)
│   └── api/                          #   ⭐ Server tier (trust boundary) — ถือ service-role key
│       ├── auth/login|logout|session #     PIN → verify_pin → เซ็น JWT → cookie httpOnly
│       ├── employees/[id]            #     CRUD พนักงาน (owner only, step-up PIN)
│       └── customer/[session_id]/
│           ├── state                 #     ข้อมูลทั้งหมดของหน้าลูกค้า (แทน realtime 5 ช่อง)
│           ├── order                 #     สั่งอาหาร (ราคามาจาก DB ไม่ใช่จาก client)
│           └── check-bill            #     เรียก/ยกเลิกเช็คบิล
│
├── components/                       # UI Components (ทั้งหมดเป็น Client Components)
│   ├── PinPad.tsx                    #   PIN 6-digit authentication keypad
│   ├── TableMap.tsx                  #   Floor map + navigation tabs + action selector
│   ├── POSOrderScreen.tsx            #   POS order + cart + notes + void + QR generation
│   ├── CheckoutScreen.tsx            #   Checkout + loyalty + multi-payment + PromptPay QR
│   ├── KitchenScreen.tsx             #   Kitchen Display System (KDS) realtime
│   ├── StockManager.tsx              #   Stock management (Owner only)
│   ├── MenuManager.tsx               #   Menu CRUD management (Owner only)
│   ├── PromoManager.tsx              #   Promotions/discounts management (Owner only)
│   ├── SalesHistory.tsx              #   Sales history & reports (Owner only)
│   ├── LoyaltyManager.tsx            #   Loyalty CRM member management (Owner only)
│   └── OwnerDashboard.tsx            #   Owner dashboard with analytics
│
├── context/
│   └── AuthContext.tsx               # PIN Auth + RBAC (owner/staff) + Session Storage
│
├── lib/
│   ├── supabase.ts                   # Browser client (anon key + JWT พนักงานผ่าน accessToken)
│   ├── staffToken.ts                 # ที่เก็บ JWT ใน memory — ห้าม import supabase (กัน key รั่วเข้า bundle ลูกค้า)
│   ├── supabaseAdmin.ts              # ⚠️ server-only — service-role key, bypass RLS
│   ├── authToken.ts                  # ⚠️ server-only — เซ็น/ตรวจ JWT ด้วย SUPABASE_JWT_SECRET
│   ├── session.ts                    # ⚠️ server-only — requireStaff() / requireOwner()
│   └── customerSession.ts            # ⚠️ server-only — ตรวจ QR session ก่อนทุก request ฝั่งลูกค้า
│
├── supabase/migrations/              # SQL Migrations (ต้อง run ตามลำดับวันที่)
│   ├── 20260705_init_schema.sql      #   9 Tables + Seeds + place_order_item RPC + RLS
│   ├── 20260707_void_order_item.sql  #   void_order_item RPC + void_logs RLS
│   ├── 20260707_customer_order_rpc.sql  # customer_place_order_item RPC + qr_sessions RLS
│   ├── 20260707_happy_hour_and_payment.sql  # Happy Hour + complete_checkout RPC
│   ├── 20260718_stock_and_reports.sql    # is_stock_tracked flag + updated RPCs
│   ├── 20260718_stock_logs.sql          # stock_logs table for manual adjustments
│   ├── 20260719_menu_categories.sql     # menu category column + seed items
│   ├── 20260720_special_notes.sql       # notes column in order_items + RPC updates
│   ├── 20260720_ingredient_cost.sql     # item_ingredients table (purchase records)
│   ├── 20260720_promotions.sql          # promotions table (%, fixed, buy_x_get_y)
│   ├── 20260720_promotion_happy_hour.sql  # start_time/end_time columns
│   ├── 20260720_promotion_menu_item.sql   # menu_item_id FK on promotions
│   ├── 20260720_payment_promotions.sql  # payment_promotions + updated checkout RPC
│   ├── 20260721_loyalty_crm.sql         # points_logs table + payments.phone_number + RPC
│   ├── 20260824_security_hardening.sql  # 🔴 A1/A2/A3 — RLS ใหม่ทั้งหมด + REVOKE/GRANT + bcrypt PIN
│   ├── 20260825_pin_lockout_hardening.sql # 🔴 A2 (หาง) — ตัด SHA-256 + DROP pin_hash + เพดานล็อกอินรวม
│   ├── 20260826_order_price_server_side.sql # 🔴 A4 — ลบ p_unit_price ราคามาจาก menu_items ฝั่ง DB
│   ├── 20260827_checkout_server_side.sql # 🔴 A5/A6 — ยอดบิลคำนวณใน DB + UNIQUE(payments.order_id)
│   └── 20260828_audit_and_integrity.sql # 🔴 A7.4-A7.7 — unique active order · void ด้วยรหัส · audit จาก JWT · FK RESTRICT
│
├── supabase/tests/
│   ├── security.sql                  # ชุดทดสอบ A1–A6 (รันใน transaction แล้ว ROLLBACK — รันซ้ำได้)
│   └── a7_audit.sql                  # ชุดทดสอบ A7.4-A7.7 + สิทธิ์ของ authenticated
│
├── docker-compose.yml                # Postgres สำหรับทดสอบ migration ในเครื่อง (พอร์ต 54329)
├── docker/postgres/init/
│   ├── 00-bootstrap.sql              #   สร้าง role anon/authenticated/service_role + pgcrypto ให้เหมือน Supabase
│   └── 10-apply-migrations.sh        #   รัน migration ตามลำดับที่ถูกต้อง (มี 3 ไฟล์ที่ชื่อเรียงผิด)
│
├── scripts/
│   ├── set-pin.mjs                   # ตั้ง PIN พนักงานผ่าน service role (ใช้ตอน deploy)
│   ├── db-test.mjs                   # รัน supabase/tests/*.sql ใส่ DB ใน docker
│   └── verify-lockdown.mjs           # ยิง anon key ใส่ DB เพื่อพิสูจน์ว่าปิดครบ
│
├── agent/rules/                      # Agent behavior rules
│   ├── main.md                       #   Personality, Architecture, Feature Rules
│   └── setting.md                    #   Communication, Naming, Commit conventions
│
├── .env.local                        # ⚠️ ต้องมี SUPABASE_SERVICE_ROLE_KEY + SUPABASE_JWT_SECRET ด้วย (ดู .env.example)
├── .env.example                      # รายการตัวแปรที่ต้องตั้ง (ไม่มีค่าจริง)
├── next.config.ts                    # allowedDevOrigins for LAN testing
├── tsconfig.json                     # TypeScript config (strict, @/* alias)
├── ROADMAP.md                        # Development roadmap & phase tracking
└── package.json                      # Dependencies & scripts
```

---

## 📄 Essential Files Reference

เมื่อต้องทำงานเกี่ยวกับส่วนต่างๆ ให้อ่านไฟล์เหล่านี้ก่อน:

### Data Schema (Database)
- **Schema หลัก:** [`supabase/migrations/20260705_init_schema.sql`](supabase/migrations/20260705_init_schema.sql) — ตาราง 9 ตารางตั้งต้น + RPC + RLS + Seed data
- **Stock system:** [`supabase/migrations/20260718_stock_and_reports.sql`](supabase/migrations/20260718_stock_and_reports.sql) — `is_stock_tracked` flag + updated RPCs
- **Promotions:** [`supabase/migrations/20260720_promotions.sql`](supabase/migrations/20260720_promotions.sql) — ตาราง promotions
- **Checkout RPC (ล่าสุด):** [`supabase/migrations/20260720_payment_promotions.sql`](supabase/migrations/20260720_payment_promotions.sql) — `complete_checkout` RPC ฉบับล่าสุด

### Authentication & Authorization
- **Auth Context:** [`context/AuthContext.tsx`](context/AuthContext.tsx) — PIN validation, SHA-256 hash, RBAC (owner/staff), session storage

### Core Business Logic
- **POS Order:** [`components/POSOrderScreen.tsx`](components/POSOrderScreen.tsx) — Order flow ฝั่ง Staff
- **Customer QR Order:** [`app/customer/[session_id]/page.tsx`](app/customer/[session_id]/page.tsx) — Order flow ฝั่งลูกค้า
- **Checkout:** [`components/CheckoutScreen.tsx`](components/CheckoutScreen.tsx) — Payment + Loyalty + PromptPay QR

---

## 🔄 Project Flow

### 1. Authentication Flow
```
เปิดแอป → PinPad.tsx (กรอก PIN 6 หลัก)
  → POST /api/auth/login (PIN เป็น plaintext ผ่าน HTTPS — ไม่ hash ฝั่ง client แล้ว)
  → RPC verify_pin() เทียบด้วย bcrypt ใน DB · hash ไม่เคยออกจากฐานข้อมูล
  → นับความพยายามที่ผิดฝั่ง server (pin_attempts) 2 ชั้น
     ต่อ IP: ผิด 5 ครั้งใน 15 นาที = ล็อก 3 นาที
     รวมทั้งระบบ: ผิด 20 ครั้งใน 5 นาที = ล็อก 1 นาที (กันคนสุ่ม x-forwarded-for หนี lockout)
  → สำเร็จ → server เซ็น JWT (claim emp_role) → cookie httpOnly + token เข้า memory
  → AuthContext เก็บ session (role: owner/staff)
  → TableMap.tsx แสดงแท็บตาม role
     Staff: ผังโต๊ะ + ครัว
     Owner: ผังโต๊ะ + ครัว + สต็อก + เมนู + โปรโมชั่น + ประวัติ + Dashboard
  → Auto-lock หลัง 5 นาทีไม่มี interaction
```

### 2. Staff Order Flow
```
TableMap (เลือกโต๊ะว่าง) → POSOrderScreen
  → เลือกเมนู (filter ตามหมวดหมู่) → เพิ่มลงตะกร้า
  → เพิ่มโน้ตพิเศษ (ถ้าต้องการ)
  → กดสั่ง → RPC: place_order_item (atomic stock deduction)
  → order_items.status = 'pending'
  → KitchenScreen แสดง realtime
```

### 3. Customer QR Order Flow
```
Staff กดปุ่ม "สร้าง QR ลูกค้า" → สร้าง qr_sessions (UUID, 2 ชม.)
  → ลูกค้าสแกน QR ด้วยมือถือ
  → /customer/[session_id] (Mobile-First UI, ไม่มี credential ใดๆ ใน bundle)
  → GET /api/customer/[session_id]/state ทุก 5 วิ (แทน realtime 5 ช่องเดิม)
  → เลือกเมนู + โน้ต → POST /api/customer/[session_id]/order
     (client ส่งแค่ menuItemId/quantity/notes — ราคามาจาก menu_items ฝั่ง server)
  → ทุก endpoint ตรวจ session validity + scope ให้เหลือเฉพาะโต๊ะของ session นั้น
```

### 4. Checkout Flow
```
TableMap (กดโต๊ะ occupied → "ชำระเงิน") → CheckoutScreen
  → แสดงสรุปบิล (รวมโน้ตพิเศษ)
  → ค้นหาสมาชิก (เบอร์โทร 10 หลัก) + ใช้แต้ม
  → ใช้โปรโมชั่น (%, fixed, buy_x_get_y)
  → เลือกวิธีชำระ: เงินสด / PromptPay QR / ผสม
  → RPC: complete_checkout — ส่งไปแค่ เงินสดที่รับมา / รหัสคูปอง / เบอร์สมาชิก / แต้มที่ขอใช้
     DB คำนวณ subtotal จาก order_items · ตรวจเงื่อนไขโปรจากตาราง promotions เอง
     · clamp แต้มที่ใช้ · แต้มที่ได้ = net / 10 · ปิดบิล + เคลียร์โต๊ะ + expire QR
     · ล็อก order ด้วย FOR UPDATE และ UNIQUE(payments.order_id) กันปิดซ้ำ
  → พิมพ์ใบเสร็จจากตัวเลขที่ RPC คืนกลับมา ไม่ใช่ที่หน้าจอคิด (window.print(), Thermal 80mm)
```

### 5. Kitchen Display Flow
```
KitchenScreen (Realtime subscription)
  → แสดง order_items ที่ status = 'pending' จัดกลุ่มตามโต๊ะ
  → Wait timer: เหลือง (8+ นาที), แดงกระพริบ (15+ นาที)
  → เสียง Chime (Web Audio API) เมื่อมีออเดอร์ใหม่
  → กดเสิร์ฟ → อัปเดต status = 'served'
```

---

## 🔐 Security Model (หลัง migration `20260824_security_hardening`)

ระบบแบ่งเป็น **3 เขตความเชื่อถือ** — แก้โค้ดตรงไหนก็ตาม ห้ามทำให้เส้นแบ่งนี้พร่า:

| เขต | ถือ credential อะไร | ทำอะไรได้ |
|---|---|---|
| **Server tier** (`app/api/*`) | `SUPABASE_SERVICE_ROLE_KEY` | ทุกอย่าง — bypass RLS |
| **เครื่อง POS** | JWT อายุ 8 ชม. (claim `emp_role`) | อ่านตารางปฏิบัติการ + realtime · เขียนตามที่ policy อนุญาต |
| **หน้าลูกค้า QR** | **ไม่มีเลย** | ผ่าน `/api/customer/[session_id]/*` เท่านั้น |
| **`anon` role** | anon key ใน bundle | **ไม่มี policy และไม่มี grant สักตัว = ทำอะไรไม่ได้** |

**กฎที่ห้ามละเมิด:**

1. **ห้ามเขียน policy ที่ให้สิทธิ์ `anon`** — ทุก policy ต้องเป็น `TO authenticated` และเรียก `public.is_staff()` หรือ `public.is_owner()`
2. **สร้าง RPC ใหม่ต้อง `REVOKE EXECUTE ... FROM PUBLIC, anon` เสมอ** — PostgreSQL grant ให้ PUBLIC เป็น default และ `SECURITY DEFINER` bypass RLS ⇒ ลืมข้อนี้ = เปิดช่องเท่าเดิมกับก่อนแก้ A1
   ⚠️ **ไม่มีตาข่ายรอง** — `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` ใน `20260824` พิสูจน์แล้วว่า**ไม่มีผลจริง** (ไม่มีแถวใน `pg_default_acl`, ฟังก์ชันใหม่ยังได้ PUBLIC EXECUTE) · ตัวที่จับได้คือ `pnpm db:test`
3. **ห้าม import `@/lib/supabase` ในหน้าลูกค้า** และห้ามให้ `lib/staffToken.ts` import supabase — ไม่งั้น anon key จะกลับไปอยู่ใน chunk ที่หน้าลูกค้าโหลด
4. **ห้าม import `supabaseAdmin` / `authToken` / `session` จาก Client Component** — มี `server-only` กันไว้ build จะพังทันที
5. **ตัวตนผู้ทำรายการต้องมาจาก JWT ฝั่ง server เท่านั้น** ไม่ใช่จาก body ที่ client ส่งมา — ใช้ `public.jwt_emp_id()` / `public.jwt_emp_name()` ใน DB หรือ `requireStaff()` ใน route handler
6. **สร้างตารางใหม่ต้อง `REVOKE ALL ... FROM anon, authenticated` แล้วค่อย GRANT เท่าที่ต้องใช้** — Supabase ตั้ง default privileges ให้ `GRANT ALL` กับทุกตารางใหม่ · `TRUNCATE` ไม่ถูก RLS คุม

พิสูจน์ว่ายังปิดอยู่:

| คำสั่ง | ทดสอบอะไร | ต้องมีอะไร |
|---|---|---|
| `pnpm db:up` แล้ว `pnpm db:test` | รัน migration ทั้งชุดบน Postgres เปล่าใน docker แล้วยิง 19 assertion ครอบ A1–A7 (สิทธิ์ anon/authenticated · lockout PIN · ราคาจาก DB · ยอดบิล · แต้ม · ปิดบิลซ้ำ · void ด้วยรหัส · audit จาก JWT · FK RESTRICT) | Docker |
| `node scripts/verify-lockdown.mjs` | ยิง anon key จริงใส่ Supabase production — ทุกข้อต้องขึ้น "ปิดแล้ว" | `.env.local` |

> ⚠️ ทุกครั้งที่แก้ migration หรือ RPC **ต้องรัน `pnpm db:reset && pnpm db:test`** ก่อนขึ้น production
> (`db:reset` = ล้าง DB แล้วรัน migration ใหม่ทั้งชุดจากศูนย์ — จับทั้งบั๊ก SQL และปัญหาลำดับไฟล์)

**สถานะ:** A1–A7 ปิดครบทุกข้อในโค้ดแล้ว (ยืนยันด้วย `pnpm db:test` 19 assertion) — เหลือขั้นตอน deploy migration จริงแล้วรัน `verify-lockdown.mjs`

สถานะรายข้อและคิวงานถัดไป: [`MODULES_MILESTONES.md`](MODULES_MILESTONES.md)

> ⚠️ `20260825_pin_lockout_hardening.sql` จะ **หยุดพร้อม error** ถ้ายังมีพนักงานที่ `pin_bcrypt IS NULL`
> ต้องตั้ง PIN ให้ครบก่อนด้วย `node scripts/set-pin.mjs --list` แล้ว `node scripts/set-pin.mjs <id> <pin>`

---

## 🗄️ Database Schema (12 ตาราง)

| ตาราง | คำอธิบาย | FK / ความสัมพันธ์ |
|-------|----------|-------------------|
| `employees` | พนักงาน (owner/staff) + PIN Hash | — |
| `tables` | โต๊ะ 1-4 (vacant/occupied/checking_out) | — |
| `qr_sessions` | เซสชัน QR ลูกค้า (UUID, หมดอายุ 2 ชม.) | → `tables.id` |
| `menu_items` | เมนู + ราคา + สต็อก + Happy Hour + category + is_stock_tracked | — |
| `orders` | ออเดอร์ (active/completed/voided) | → `tables.id`, → `qr_sessions.id` |
| `order_items` | รายการย่อย (pending/served/voided) + notes | → `orders.id`, → `menu_items.id` |
| `void_logs` | ประวัติการ Void + เหตุผล + restored_stock | — |
| `loyalty_members` | สมาชิก (เบอร์โทร PK + ชื่อ + แต้ม) | — |
| `payments` | ธุรกรรมชำระเงิน (cash/promptpay/mixed) + phone_number | → `orders.id`, → `loyalty_members.phone_number` |
| `promotions` | โปรโมชั่น (%, fixed, buy_x_get_y) + เงื่อนไข | → `menu_items.id` (optional) |
| `payment_promotions` | โปรที่ใช้ในแต่ละบิล | → `payments.id`, → `promotions.id` |
| `stock_logs` | ประวัติปรับสต็อกด้วยมือ | → `menu_items.id` |
| `item_ingredients` | ประวัติจัดซื้อวัตถุดิบ | — |
| `points_logs` | ประวัติการปรับแต้มสมาชิกด้วยมือ (Audit Log) | → `loyalty_members.phone_number` |
| `pin_attempts` | ตัวนับความพยายามล็อกอินฝั่ง server (lockout) — ต่อ IP + เพดานรวมทั้งระบบ | — |

---

## 🔧 Supabase RPC Functions

| ฟังก์ชัน | Parameters | คำอธิบาย | Security |
|----------|-----------|----------|----------|
| `place_order_item` | `(p_table_id, p_menu_item_id, p_quantity, p_notes)` | พนักงานสั่ง — **ราคาอ่านจาก menu_items ใน DB** + atomic stock | DEFINER · `authenticated` |
| `void_order_item` | `(p_order_item_id, p_reason_code, p_reason_note, p_void_quantity)` | ยกเลิกรายการ — คืนสต็อกตาม**รหัส**เหตุผล (`lib/voidReasons.ts`) · ผู้ทำรายการมาจาก JWT | DEFINER · `authenticated` |
| `customer_place_order_item` | `(p_session_id, p_menu_item_id, p_quantity, p_notes)` | ลูกค้าสั่งผ่าน QR + ตรวจ session — **ราคาอ่านจาก menu_items** | DEFINER · `service_role` |
| `complete_checkout` | `(p_order_id, p_cash_received, p_coupon_code, p_phone_number, p_points_redeem)` | ปิดบิล — **คำนวณ subtotal/ส่วนลด/แต้ม/ยอดสุทธิเองใน DB** แล้วคืนค่าที่บันทึกจริงกลับไปให้ใบเสร็จ · ล็อก order + กันปิดซ้ำ | DEFINER · `authenticated` |
| `verify_pin` | `(p_pin, p_client_key)` | ตรวจ PIN ด้วย bcrypt + lockout — **`service_role` เท่านั้น** | DEFINER |
| `admin_list_employees` | `()` | รายชื่อพนักงาน (ไม่มี hash) — **`service_role` เท่านั้น** | DEFINER |
| `admin_add_employee` | `(p_name, p_pin, p_role)` | เพิ่มพนักงาน + hash bcrypt ใน DB — **`service_role` เท่านั้น** | DEFINER |
| `admin_update_employee` | `(p_employee_id, p_name, p_pin, p_role)` | แก้ไข + กันลดสิทธิ์ owner คนสุดท้าย — **`service_role` เท่านั้น** | DEFINER |
| `admin_delete_employee` | `(p_employee_id, p_actor_id)` | ลบ + กันลบตัวเอง/owner คนสุดท้าย — **`service_role` เท่านั้น** | DEFINER |

> ❌ `add_employee` / `update_employee` / `delete_employee` เดิม **ถูก DROP ทิ้งแล้ว** (A3 — เป็น SECURITY DEFINER ที่ไม่มี authorization check)

> ⚠️ **ทุก RPC เป็น `SECURITY DEFINER`** — แก้ไขด้วยความระมัดระวัง เพราะทำงานด้วยสิทธิ์ของเจ้าของฟังก์ชัน ไม่ใช่สิทธิ์ของผู้เรียก
