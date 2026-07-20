# 🗺️ Yokayaki POS — Development Roadmap

> Last Updated: 2026-07-20  
> Stack: Next.js 16 (Turbopack) + Supabase + TailwindCSS 4 + TypeScript

---

## สถานะรวม (Overall Progress)

| Phase | ชื่อ | สถานะ |
|-------|------|-------|
| 1 | Core Foundation & Security | ✅ เสร็จสมบูรณ์ |
| 2 | Ordering & Stock Management | ✅ เสร็จสมบูรณ์ |
| 3 | Dynamic QR Ordering Sessions | ✅ เสร็จสมบูรณ์ |
| 4 | Happy Hour & Loyalty | ✅ เสร็จสมบูรณ์ |
| 5 | Checkout & PromptPay QR | ✅ เสร็จสมบูรณ์ |
| 6 | หมวดหมู่เมนู (Menu Categories) | ✅ เสร็จสมบูรณ์ |
| 7 | โน้ตพิเศษ (Special Notes) | ✅ เสร็จสมบูรณ์ |
| 8 | หน้าจอครัว (Kitchen Display System) | ✅ เสร็จสมบูรณ์ |
| 9 | Owner Reports & EOD Audit | ✅ เสร็จสมบูรณ์ |

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

## Phase 4 & 5: Happy Hour, Loyalty & Checkout ✅

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

## Phase 6: หมวดหมู่เมนู (Menu Categories) ✅

**เป้าหมาย:** จัดกลุ่มเมนูอาหารตามหมวดหมู่ (เส้น, ซาซิมิ, ของทอด, ของหวาน, หม้อไฟ) เพื่อให้กดสั่งได้เร็วขึ้น

### ไฟล์ที่สร้าง/แก้ไข
| ไฟล์ | ประเภท | คำอธิบาย |
|------|--------|----------|
| [20260719_menu_categories.sql](file:///c:/Users/PP/Desktop/React/yokayaki/supabase/migrations/20260719_menu_categories.sql) | SQL | เพิ่มฟิลด์ `category` ในตาราง `menu_items`, จัดกลุ่มเมนูเดิม, Seed เมนูใหม่ตามหมวดหมู่ |
| [components/POSOrderScreen.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/POSOrderScreen.tsx) | Component | เพิ่มแท็บหมวดหมู่แนวนอนกรองเมนู |
| [app/customer/[session_id]/page.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/app/customer/%5Bsession_id%5D/page.tsx) | Page | เพิ่มแท็บหมวดหมู่ Sticky สไตล์ Mobile-First |
| [components/StockManager.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/StockManager.tsx) | Component | แสดงป้ายหมวดหมู่ข้างชื่อเมนู, ปรับ realtime query |

### ผลลัพธ์
- ✅ หมวดหมู่: ย่าง, เส้น, ซาซิมิ, ของทอด, ของหวาน, หม้อไฟ, เครื่องดื่ม, อื่นๆ
- ✅ แท็บกรองหมวดหมู่แบบสไลด์แนวนอนทั้งฝั่งพนักงานและลูกค้า
- ✅ Seed เมนูตัวอย่างใหม่ (ราเมง, เทมปุระ, โมจิ, สุกี้ยากี้ ฯลฯ)

---

## Phase 7: โน้ตพิเศษ (Special Notes) ✅

**เป้าหมาย:** ให้ลูกค้าและพนักงานระบุข้อกำหนดพิเศษ เช่น "ไม่ผัก", "เผ็ดน้อย" ในแต่ละจาน

### ไฟล์ที่สร้าง/แก้ไข
| ไฟล์ | ประเภท | คำอธิบาย |
|------|--------|----------|
| [20260720_special_notes.sql](file:///c:/Users/PP/Desktop/React/yokayaki/supabase/migrations/20260720_special_notes.sql) | SQL | เพิ่มคอลัมน์ `notes` ในตาราง `order_items`, อัปเดต RPC ทั้ง 2 ฟังก์ชัน |
| [components/POSOrderScreen.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/POSOrderScreen.tsx) | Component | ปุ่มแก้ไขโน้ตใน Cart + ปุ่มลัดด่วน (ไม่ผัก, เผ็ดน้อย, เผ็ดมาก, แยกซอส) + ช่องพิมพ์เอง |
| [app/customer/[session_id]/page.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/app/customer/%5Bsession_id%5D/page.tsx) | Page | Bottom Drawer ตะกร้า + Note Modal สำหรับลูกค้ามือถือ |
| [components/CheckoutScreen.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/CheckoutScreen.tsx) | Component | แสดงโน้ตในสรุปบิลและใบเสร็จพิมพ์ |

### ผลลัพธ์
- ✅ เมนูเดียวกันแต่โน้ตต่างกันแยกรายการในตะกร้าอัตโนมัติ
- ✅ ปุ่มลัดโน้ตยอดฮิต 6 ตัวเลือก + ช่องพิมพ์เองอิสระ
- ✅ ลูกค้ามือถือเปิดตะกร้าแบบ Drawer สไลด์ขึ้นจากด้านล่าง
- ✅ โน้ตพิเศษแสดงบนใบเสร็จ Thermal Printer

---

## Phase 8: หน้าจอครัว — Kitchen Display System (KDS) ✅

**เป้าหมาย:** แสดงรายการอาหารที่รอปรุงในครัวแบบเรียลไทม์ จัดกลุ่มตามโต๊ะ พร้อมเสียงแจ้งเตือนเมื่อมีออเดอร์ใหม่

### ไฟล์ที่สร้าง/แก้ไข
| ไฟล์ | ประเภท | คำอธิบาย |
|------|--------|----------|
| [components/KitchenScreen.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/KitchenScreen.tsx) | Component | หน้าจอครัว: จัดกลุ่มตามโต๊ะ, เวลารอ, เสียง Chime (Web Audio API), ปุ่มเสิร์ฟ |
| [components/TableMap.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/TableMap.tsx) | Component | เพิ่มแท็บ "หน้าจอครัว" สำหรับทั้ง Staff และ Owner |

### ผลลัพธ์
- ✅ Table Cards: จัดกลุ่มออเดอร์แยกตามโต๊ะ เรียงตามเวลาสั่ง (เก่าก่อน)
- ✅ Wait Timer: ไฮไลต์สีเหลือง (8+ นาที) หรือสีแดงกระพริบ (15+ นาที)
- ✅ เสียงแจ้งเตือน Chime (Web Audio API Synthesizer) เมื่อมีออเดอร์ใหม่เข้า พร้อมปุ่มเปิด/ปิดเสียง
- ✅ ปุ่ม "เสิร์ฟ" รายจาน หรือ "เสิร์ฟทั้งหมดของโต๊ะ" ในคลิกเดียว
- ✅ Staff เห็นแท็บ: ผังโต๊ะ + หน้าจอครัว | Owner เห็น: ผังโต๊ะ + ครัว + สต็อก + Dashboard

---

## Phase 9: Owner Reports & EOD Audit ✅

**เป้าหมาย:** หน้ารายงานยอดขายรายชั่วโมง, ประวัติ Void, สถิติเมนูยอดนิยม และปรับปรุงหน้ารายการจัดซื้อวัตถุดิบแยกตามวัน

### ไฟล์ที่สร้าง/แก้ไข
| ไฟล์ | ประเภท | คำอธิบาย |
|------|--------|----------|
| [components/OwnerDashboard.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/OwnerDashboard.tsx) | Component | แดชบอร์ดสรุป ยอดขายสุทธิ, ต้นทุนวัตถุดิบ, กำไรสุทธิ, กราฟยอดขาย Adaptive ตาม Preset (วันนี้/เมื่อวาน/สัปดาห์นี้/เดือนนี้/เดือนที่แล้ว), สรุปสถิติ Void |
| [components/StockManager.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/StockManager.tsx) | Component | ระบบจัดการต้นทุนวัตถุดิบ: กรองข้อมูล 5 รูปแบบ, ตารางจัดกลุ่มตามวัน (วันที่ / จำนวนประเภทวัตถุดิบ / ยอดราคารวม / ผู้จัดซื้อ), หน้า Drill-down จัดการรายชิ้น (แก้ไข/ลบ), Dropdown ตัวเลือกวัตถุดิบและหน่วยเพื่อความสะดวกรวดเร็ว |
| [components/SalesHistory.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/SalesHistory.tsx) | Component | บันทึกประวัติและตรวจสอบ: แบ่งแท็บย่อย "ยอดขายวันนี้" (Sales History) และ "ประวัติการยกเลิก" (Void Logs) ของวันนี้ |

### ผลลัพธ์
- ✅ แดชบอร์ดรายงานผลวิเคราะห์ ยอดขาย กำไร และต้นทุนวัตถุดิบเรียบหรูใช้งานง่าย
- ✅ กราฟแท่งแสดงยอดขายปรับขนาดอัตโนมัติตามระยะเวลา (Adaptive Chart)
- ✅ ตารางจัดกลุ่มรายการจัดซื้อรายวัน พร้อม Drill-down เจาะลึกรายชิ้น
- ✅ dropdown เลือกชื่อวัตถุดิบ/หน่วยพร้อมพิมพ์เพิ่มใหม่ได้ทันที ป้องกันความเหนื่อยล้าในการกรอกข้อมูล
- ✅ แถบสลับ Tab ในหน้าประวัติการขาย แสดงรายละเอียดบิลและประวัติยกเลิกออเดอร์ (Void Audit Log)
- ✅ ป้องกันการเข้าถึงรายงานและประวัติสำหรับพนักงานทั่วไป (role = 'staff' ไม่เห็นแดชบอร์ด/สต็อก/ประวัติการขาย)


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
│   ├── TableMap.tsx                   # Floor Map + Action Selector + Nav Tabs
│   ├── POSOrderScreen.tsx             # POS Order + Cart + Notes + Void + QR
│   ├── CheckoutScreen.tsx             # Checkout + Loyalty + PromptPay QR
│   ├── StockManager.tsx               # Stock Management (Owner)
│   ├── OwnerDashboard.tsx             # Owner Reports Dashboard
│   └── KitchenScreen.tsx              # Kitchen Display System (KDS)
├── context/
│   └── AuthContext.tsx                # PIN Auth + Session Management
├── lib/
│   └── supabase.ts                   # Supabase Client
├── supabase/migrations/
│   ├── 20260705_init_schema.sql       # 9 Tables + Seeds + RPC + RLS
│   ├── 20260707_void_order_item.sql   # Void RPC + RLS
│   ├── 20260707_customer_order_rpc.sql # Customer Order RPC + RLS
│   ├── 20260707_happy_hour_and_payment.sql # Happy Hour + Checkout RPC
│   ├── 20260719_menu_categories.sql   # Menu Categories + Seed Items
│   └── 20260720_special_notes.sql     # Notes Column + RPC Update
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
| `place_order_item` | พนักงานสั่งอาหาร + หักสต็อก atomic + รองรับโน้ตพิเศษ | DEFINER |
| `void_order_item` | ยกเลิกรายการ + คืน/ไม่คืนสต็อก + log | DEFINER |
| `customer_place_order_item` | ลูกค้าสั่งผ่าน QR + ตรวจ session + หักสต็อก + รองรับโน้ตพิเศษ | DEFINER |
| `complete_checkout` | ปิดบิล + บันทึก payment + อัปเดตแต้ม + เคลียร์โต๊ะ | DEFINER |

---

## 🗄️ Database Tables (9 ตาราง)

| ตาราง | คำอธิบาย |
|-------|----------|
| `employees` | พนักงาน (owner/staff) + PIN Hash |
| `tables` | โต๊ะ 1-4 (vacant/occupied/checking_out) |
| `qr_sessions` | เซสชัน QR สำหรับลูกค้า (UUID + หมดอายุ) |
| `menu_items` | รายการเมนู + สต็อก + ราคา Happy Hour + หมวดหมู่ (category) |
| `orders` | ออเดอร์ (active/completed/voided) |
| `order_items` | รายการย่อยในออเดอร์ (pending/served/voided) + โน้ตพิเศษ |
| `void_logs` | ประวัติการยกเลิก + เหตุผล + คืนสต็อกหรือไม่ |
| `loyalty_members` | สมาชิก (เบอร์โทร + ชื่อ + แต้ม) |
| `payments` | ธุรกรรมชำระเงิน (cash/promptpay/mixed) |

