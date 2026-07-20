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
├── app/                              # Next.js App Router (Pages)
│   ├── layout.tsx                    #   Root Layout + AuthProvider wrapper
│   ├── page.tsx                      #   Landing: PinPad → TableMap switcher
│   ├── globals.css                   #   Global styles (Tailwind import)
│   └── customer/
│       └── [session_id]/
│           └── page.tsx              #   Customer QR Order Portal (Mobile-First)
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
│   └── supabase.ts                   # Supabase Client Singleton (anon key)
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
│   └── 20260721_loyalty_crm.sql         # points_logs table + payments.phone_number + RPC
│
├── agent/rules/                      # Agent behavior rules
│   ├── main.md                       #   Personality, Architecture, Feature Rules
│   └── setting.md                    #   Communication, Naming, Commit conventions
│
├── .env.local                        # Supabase URL, Anon Key, PromptPay ID
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
  → SHA-256 hash → เทียบกับ employees.pin_hash
  → สำเร็จ → AuthContext เก็บ session (role: owner/staff)
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
  → /customer/[session_id] (Mobile-First UI)
  → เลือกเมนู + โน้ต → RPC: customer_place_order_item
  → ตรวจสอบ session validity ก่อนทุกครั้ง
```

### 4. Checkout Flow
```
TableMap (กดโต๊ะ occupied → "ชำระเงิน") → CheckoutScreen
  → แสดงสรุปบิล (รวมโน้ตพิเศษ)
  → ค้นหาสมาชิก (เบอร์โทร 10 หลัก) + ใช้แต้ม
  → ใช้โปรโมชั่น (%, fixed, buy_x_get_y)
  → เลือกวิธีชำระ: เงินสด / PromptPay QR / ผสม
  → RPC: complete_checkout (ปิดบิล + บันทึก payment + อัปเดตแต้ม + เคลียร์โต๊ะ + expire QR sessions)
  → พิมพ์ใบเสร็จ (window.print(), Thermal 80mm)
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

---

## 🔧 Supabase RPC Functions

| ฟังก์ชัน | Parameters | คำอธิบาย | Security |
|----------|-----------|----------|----------|
| `place_order_item` | `(p_table_id, p_menu_item_id, p_quantity, p_unit_price)` | พนักงานสั่ง + atomic stock deduction + รองรับ is_stock_tracked | DEFINER |
| `void_order_item` | ดูใน migration `20260707_void_order_item.sql` | ยกเลิกรายการ + เลือกคืน/ไม่คืนสต็อก + void_logs | DEFINER |
| `customer_place_order_item` | `(p_session_id, p_menu_item_id, p_quantity, p_unit_price)` | ลูกค้าสั่งผ่าน QR + ตรวจ session + atomic stock | DEFINER |
| `complete_checkout` | `(p_order_id, p_payment_method, p_subtotal, p_discount_amount, p_net_amount, p_points_earned, p_points_redeemed, p_phone_number, p_applied_promos)` | ปิดบิล + payment + แต้ม + เคลียร์โต๊ะ + expire QR + บันทึกโปรโมชั่น | DEFINER |

> ⚠️ **ทุก RPC เป็น `SECURITY DEFINER`** — แก้ไขด้วยความระมัดระวัง เพราะทำงานด้วยสิทธิ์ของเจ้าของฟังก์ชัน ไม่ใช่สิทธิ์ของผู้เรียก
