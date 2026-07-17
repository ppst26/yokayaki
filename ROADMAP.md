# 🗺️ Yokayaki POS — Development Roadmap

> Last Updated: 2026-07-07  
> Stack: Next.js 16 (Turbopack) + Supabase + TailwindCSS 4 + TypeScript

---

## สถานะรวม (Overall Progress)

| Phase | ชื่อ | สถานะ |
|-------|------|-------|
| 1 | Core Foundation & Security | ✅ เสร็จสมบูรณ์ |
| 2 | Ordering & Stock Management | ✅ เสร็จสมบูรณ์ |
| 3 | Dynamic QR Ordering Sessions | ✅ เสร็จสมบูรณ์ |
| 4 | Happy Hour & Loyalty | ✅ โค้ดเสร็จ (รอรัน SQL) |
| 5 | Checkout & PromptPay QR | ✅ โค้ดเสร็จ (รอรัน SQL) |
| 6 | Owner Reports & EOD Audit | ⬜ ยังไม่เริ่ม |

---

## Phase 1: Core Foundation & Security ✅

**เป้าหมาย:** เชื่อม Supabase, สร้างตารางทั้ง 9 ตาราง, ระบบล็อกอินพนักงานด้วย PIN 6 หลัก, หน้าจอผังโต๊ะเรียลไทม์

### ไฟล์ที่สร้าง/แก้ไข
| ไฟล์ | ประเภท | คำอธิบาย |
|------|--------|----------|
| [.env.local](file:///c:/Users/PP/Desktop/React/yokayaki/.env.local) | Config | Supabase URL, Anon Key, PromptPay ID |
| [lib/supabase.ts](file:///c:/Users/PP/Desktop/React/yokayaki/lib/supabase.ts) | Lib | Supabase Client Singleton |
| [context/AuthContext.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/context/AuthContext.tsx) | Context | ระบบ PIN Auth, SHA-256 Hash (Web Crypto + JS Fallback), Session Storage |
| [components/PinPad.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/PinPad.tsx) | Component | แป้นกด PIN 6 หลัก, Shake Animation เมื่อผิด |
| [components/TableMap.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/TableMap.tsx) | Component | ผังโต๊ะ 1-4, Realtime Subscription, Auto-Lock 5 นาที |
| [app/layout.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/app/layout.tsx) | Page | Root Layout ครอบ `AuthProvider` |
| [app/page.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/app/page.tsx) | Page | สลับแสดง PinPad / TableMap ตามสถานะล็อกอิน |
| [20260705_init_schema.sql](file:///c:/Users/PP/Desktop/React/yokayaki/supabase/migrations/20260705_init_schema.sql) | SQL | สร้าง 9 ตาราง, Seed พนักงาน/เมนู/โต๊ะ, `place_order_item` RPC, RLS Policies |

### ผลลัพธ์
- ✅ พนักงาน Owner กรอก PIN `111111`, Staff กรอก PIN `222222`
- ✅ ผังโต๊ะซิงค์สถานะเรียลไทม์จาก Supabase
- ✅ Auto-Lock 5 นาทีเมื่อไม่มีการตอบสนอง

---

## Phase 2: Ordering & Stock Management ✅

**เป้าหมาย:** พนักงานสั่งอาหารหักสต็อก Atomic, ยกเลิกรายการ (Void) พร้อมเลือกเหตุผล, บันทึกประวัติ void_logs

### ไฟล์ที่สร้าง/แก้ไข
| ไฟล์ | ประเภท | คำอธิบาย |
|------|--------|----------|
| [components/POSOrderScreen.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/POSOrderScreen.tsx) | Component | หน้าจอสั่งอาหาร, แสดง Urgency Badge / SOLD OUT, ตะกร้าสินค้า, ประวัติออเดอร์, Void Dialog, QR ลูกค้า, สรุปยอดสั่งซื้อ |
| [20260707_void_order_item.sql](file:///c:/Users/PP/Desktop/React/yokayaki/supabase/migrations/20260707_void_order_item.sql) | SQL | `void_order_item` RPC, RLS ของ orders/order_items/void_logs |

### ผลลัพธ์
- ✅ สั่งอาหารผ่าน RPC `place_order_item` (SECURITY DEFINER) ป้องกัน Race Condition
- ✅ Badge สีส้ม "ด่วน! เหลือ X จาน" เมื่อสต็อก ≤ 3
- ✅ ป้าย SOLD OUT เมื่อสต็อก = 0
- ✅ Void รายการอาหาร: "คีย์ผิดพลาด" (คืนสต็อก) / "อาหารชำรุด" (ไม่คืนสต็อก)
- ✅ แถบสรุป "สั่งไปแล้วทั้งหมด: X ชิ้น | XX บาท" ในหน้าสั่งอาหาร

---

## Phase 3: Dynamic QR Ordering Sessions ✅

**เป้าหมาย:** พนักงานสร้าง QR Code ให้ลูกค้าสแกนสั่งอาหารผ่านมือถือ (อายุ 2 ชม.), รองรับ Local Network

### ไฟล์ที่สร้าง/แก้ไข
| ไฟล์ | ประเภท | คำอธิบาย |
|------|--------|----------|
| [app/customer/[session_id]/page.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/app/customer/%5Bsession_id%5D/page.tsx) | Page | หน้าสั่งอาหารลูกค้า (Mobile First), ตะกร้าลอย, ประวัติรายการที่สั่งไปแล้ว |
| [20260707_customer_order_rpc.sql](file:///c:/Users/PP/Desktop/React/yokayaki/supabase/migrations/20260707_customer_order_rpc.sql) | SQL | `customer_place_order_item` RPC, RLS qr_sessions |
| [next.config.ts](file:///c:/Users/PP/Desktop/React/yokayaki/next.config.ts) | Config | เพิ่ม `allowedDevOrigins` สำหรับทดสอบผ่าน Local IP |

### ผลลัพธ์
- ✅ ปุ่ม "สร้าง QR ลูกค้า" บนหน้า POS → Modal แสดง QR Code
- ✅ มือถือสแกน QR → เข้าหน้าสั่งอาหาร Mobile ได้ทันที (ผ่าน Local Network IP)
- ✅ ลูกค้าดูประวัติรายการที่สั่งไปแล้ว + ยอดรวมสะสม
- ✅ Session UUID หมดอายุอัตโนมัติ 2 ชม. หรือเมื่อเช็คบิล
- ✅ SHA-256 Pure JS Fallback สำหรับ HTTP บน Local Network (ไม่ใช่ HTTPS)

---

## Phase 4 & 5: Happy Hour, Loyalty & Checkout ✅ (รอรัน SQL)

**เป้าหมาย:** Happy Hour ลดราคาตามเวลา, ระบบสมาชิกสะสมแต้ม, หน้าเช็คบิลรับเงิน Multi-Payment, PromptPay QR, พิมพ์ใบเสร็จ

### ไฟล์ที่สร้าง/แก้ไข
| ไฟล์ | ประเภท | คำอธิบาย |
|------|--------|----------|
| [components/CheckoutScreen.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/CheckoutScreen.tsx) | Component | หน้าเช็คบิล: สรุปบิล, ค้นหาสมาชิก, ใช้แต้ม, คำนวณเงินทอน, PromptPay QR (EMVCo), พิมพ์ใบเสร็จ |
| [components/TableMap.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/TableMap.tsx) | Component | เพิ่ม Action Selector Modal: "สั่งอาหารเพิ่ม" / "ชำระเงิน" เมื่อกดโต๊ะ Occupied |
| [20260707_happy_hour_and_payment.sql](file:///c:/Users/PP/Desktop/React/yokayaki/supabase/migrations/20260707_happy_hour_and_payment.sql) | SQL | Happy Hour prices, RLS payments/loyalty_members, `complete_checkout` RPC |

### ผลลัพธ์
- ✅ Happy Hour: เบียร์สด 120→80 บาท, ยากิโทริ 80→50 บาท (17:00-19:00)
- ✅ สมาชิก: สมัครด้วยเบอร์ 10 หลัก, สะสมแต้ม (25บ=1แต้ม), ใช้แต้ม (1แต้ม=1บาท)
- ✅ Multi-Payment: เงินสด/โอน/ผสม + คำนวณเงินทอนอัตโนมัติ
- ✅ PromptPay QR: สร้าง EMVCo Dynamic QR ตามยอดเงินจริง
- ✅ ใบเสร็จดิจิทัล: พิมพ์ผ่าน `window.print()` รองรับ Thermal Printer 80mm

---

## Phase 6: Owner Reports & EOD Audit ⬜

**เป้าหมาย:** หน้ารายงานยอดขายรายชั่วโมง, ประวัติ Void, สถิติเมนูยอดนิยม สำหรับ Owner เท่านั้น

### สิ่งที่ต้องทำ
- [ ] หน้า Dashboard รายงานยอดขายประจำวัน (EOD Report)
- [ ] ตารางประวัติ Void ย้อนหลัง
- [ ] กราฟยอดขายรายชั่วโมง
- [ ] สรุปเมนูขายดีที่สุด / ขายน้อยที่สุด
- [ ] ระบบซ่อนปุ่ม Report สำหรับ role = 'staff'

---

## 📁 โครงสร้างไฟล์โปรเจกต์ (Project Structure)

```
yokayaki/
├── app/
│   ├── layout.tsx                     # Root Layout + AuthProvider
│   ├── page.tsx                       # PinPad / TableMap Switcher
│   └── customer/
│       └── [session_id]/
│           └── page.tsx               # Customer Mobile Order Portal
├── components/
│   ├── PinPad.tsx                     # PIN 6-digit Input
│   ├── TableMap.tsx                   # Floor Map + Action Selector
│   ├── POSOrderScreen.tsx             # POS Order + Cart + Void + QR
│   └── CheckoutScreen.tsx             # Checkout + Loyalty + PromptPay QR
├── context/
│   └── AuthContext.tsx                # PIN Auth + Session Management
├── lib/
│   └── supabase.ts                   # Supabase Client
├── supabase/migrations/
│   ├── 20260705_init_schema.sql       # 9 Tables + Seeds + RPC + RLS
│   ├── 20260707_void_order_item.sql   # Void RPC + RLS
│   ├── 20260707_customer_order_rpc.sql # Customer Order RPC + RLS
│   └── 20260707_happy_hour_and_payment.sql # Happy Hour + Checkout RPC
├── docs/superpowers/
│   ├── plans/                         # Development Plans
│   └── specs/                         # Feature Specifications (order.md, etc.)
├── .env.local                         # Supabase Keys + PromptPay ID
├── next.config.ts                     # allowedDevOrigins for LAN testing
└── package.json                       # Dependencies
```

---

## 🔧 Supabase RPC Functions

| ฟังก์ชัน | คำอธิบาย | SECURITY |
|----------|----------|----------|
| `place_order_item` | พนักงานสั่งอาหาร + หักสต็อก atomic | DEFINER |
| `void_order_item` | ยกเลิกรายการ + คืน/ไม่คืนสต็อก + log | DEFINER |
| `customer_place_order_item` | ลูกค้าสั่งผ่าน QR + ตรวจ session + หักสต็อก | DEFINER |
| `complete_checkout` | ปิดบิล + บันทึก payment + อัปเดตแต้ม + เคลียร์โต๊ะ | DEFINER |

---

## 🗄️ Database Tables (9 ตาราง)

| ตาราง | คำอธิบาย |
|-------|----------|
| `employees` | พนักงาน (owner/staff) + PIN Hash |
| `tables` | โต๊ะ 1-4 (vacant/occupied/checking_out) |
| `qr_sessions` | เซสชัน QR สำหรับลูกค้า (UUID + หมดอายุ) |
| `menu_items` | รายการเมนู + สต็อก + ราคา Happy Hour |
| `orders` | ออเดอร์ (active/completed/voided) |
| `order_items` | รายการย่อยในออเดอร์ (pending/served/voided) |
| `void_logs` | ประวัติการยกเลิก + เหตุผล + คืนสต็อกหรือไม่ |
| `loyalty_members` | สมาชิก (เบอร์โทร + ชื่อ + แต้ม) |
| `payments` | ธุรกรรมชำระเงิน (cash/promptpay/mixed) |
