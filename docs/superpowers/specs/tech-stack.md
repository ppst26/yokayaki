# Technology Stack Specification: Yokayaki Izakaya POS

เอกสารระบุโครงสร้างและข้อกำหนดเทคโนโลยี (Technology Stack) ที่ใช้ในโครงการพัฒนาแอปพลิเคชันระบบ POS ไฮบริดร้าน Yokayaki Izakaya

---

## 1. โครงสร้างเทคโนโลยีหลัก (Core Stack & Version Floor)

เทคโนโลยีหลักได้รับการจัดตั้งตามมาตรฐานเว็บแอปพลิเคชันยุคใหม่ เน้นความเร็ว (Performance), ความปลอดภัย (Security), และการซิงค์ข้อมูลเรียลไทม์ (Real-time Sync):

*   **Frontend Framework:** Next.js `16.2.10` (App Router)
*   **Core Library:** React `19.2.4` / React DOM `19.2.4`
*   **Styling (CSS):** Vanilla CSS / Tailwind CSS (สำหรับการจัดสไตล์แบบ Utility-first ควบคุมความสวยงามและดีไซน์พรีเมียมสีเข้ม)
*   **UI Elements & Icons:** Lucide React `1.23.0` (สำหรับชุดไอคอนระบบงานขาย)
*   **QR Code Generator:** `react-qr-code` `2.2.0` (สร้าง QR Code สำหรับลูกค้าสั่งอาหาร และ PromptPay EMVCo Dynamic QR)
*   **Database & BaaS:** Supabase (PostgreSQL)
*   **Client Library:** `@supabase/supabase-js` `2.110.0` (สำหรับดึงข้อมูลและอัปเดตแบบเรียลไทม์)
*   **Package Manager:** `pnpm` `10.11.0`

---

## 2. บทบาทและการทำงานของแต่ละชั้นเทคโนโลยี (Architectural Roles)

### 2.1 ส่วนแสดงผล (Frontend - Next.js App Router)
*   **Next.js (App Router):** จัดสรรเส้นทาง (Routing) ของระบบโดยแยกฝั่ง Staff POS (`/` บนตัวเครื่องแท็บเล็ตหลัก) และฝั่งลูกค้าที่สแกน QR สั่งอาหาร (`/customer/[session-id]`) ออกจากกัน
*   **React Context API:** ใช้เก็บสถานะการเข้างานของพนักงาน (Auth Context & PIN Session) แบบ Global State ทั่วถึงทุกคอมโพเนนต์
*   **Tailwind CSS:** ควบคุมสีสันโทนร้านอิซากายะมืด (Dark Mode / Glassmorphism) และป้ายเตือนต่างๆ ให้มีความเป็นระเบียบสวยงาม

### 2.2 ส่วนเก็บข้อมูลและตรรกะหลังบ้าน (Database & Serverless Logic - Supabase)
*   **Supabase (PostgreSQL):** เป็นฐานข้อมูลหลักที่รองรับฟีเจอร์จัดเก็บประวัติ บัญชีสต็อก สมาชิก และรายการขาย
*   **Supabase Real-time Engine:** ใช้คอยฟีดอัปเดตคำสั่งซื้อจาก QR Code โทรศัพท์ลูกค้าเข้ามาโชว์ที่ผังโต๊ะของ POS พนักงานทันทีแบบไม่ต้องกดรีเฟรชหน้าจอ (Real-time Sync)
*   **Postgres Stored Procedures & Functions (RPC):** ใช้รันตรรกะคำนวณซับซ้อนที่หลังบ้านโดยตรง เช่น ฟังก์ชันการสั่งซื้อแบบหักสต็อกอัตโนมัติ เพื่อรับประกันความถูกต้องแม่นยำสูงและป้องกันปัญหาออเดอร์ชนกัน (Race Condition Protection)
*   **Row Level Security (RLS):** นโยบายความปลอดภัยเพื่อกั้นไม่ให้ลูกค้าที่สั่งผ่าน QR Code สามารถส่องดูยอดขายรายวันของเจ้าของร้าน หรือเข้าถึงข้อมูลพนักงานคนอื่นได้

---

## 3. แผนการจัดวางโครงสร้างโฟลเดอร์ (Folder Structure)

```text
yokayaki/
├── app/                  # Next.js App Router (หน้าจอหลักและเส้นทางเข้าถึง)
│   ├── globals.css       # การตั้งค่า CSS และ Design Tokens
│   ├── layout.tsx        # โครงสร้าง Layout หลักครอบด้วย AuthProvider
│   ├── page.tsx          # หน้าแลนดิ้งเพจ POS สลับระหว่าง PIN / Table Map
│   └── customer/
│       └── [session_id]/
│           └── page.tsx  # หน้าสั่งอาหารลูกค้า (Mobile First)
├── components/           # คอมโพเนนต์ UI
│   ├── PinPad.tsx        # กล่องกรอก PIN 6 หลัก
│   ├── TableMap.tsx      # ผังโต๊ะ + Action Selector
│   ├── POSOrderScreen.tsx # สั่งอาหาร + ตะกร้า + Void + QR ลูกค้า
│   └── CheckoutScreen.tsx # เช็คบิล + สมาชิก + PromptPay QR + ใบเสร็จ
├── context/              # Context Providers (AuthContext ระบบระบุตัวตน)
├── docs/                 # เอกสาร Specs, แผนงาน และ Business Logic
│   └── superpowers/
│       ├── plans/        # แผนงานการพัฒนาในแต่ละเฟส
│       └── specs/        # เอกสารคุณสมบัติธุรกิจ (Overview, Stock, Payment)
├── lib/                  # ฟังก์ชันและตัวเชื่อมต่อภายนอก (Supabase client)
├── public/               # ไฟล์รูปภาพ ไอคอน โลโก้ของร้าน
├── supabase/             # โครงร่างการจัดการฐานข้อมูล
│   └── migrations/       # SQL Script ไฟล์ Migration สำหรับติดตั้งตาราง
│       ├── 20260705_init_schema.sql           # 9 ตาราง + Seeds
│       ├── 20260707_void_order_item.sql       # Void RPC + RLS
│       ├── 20260707_customer_order_rpc.sql    # Customer Order RPC
│       └── 20260707_happy_hour_and_payment.sql # Checkout RPC
├── .env.local            # Supabase Keys + PromptPay ID
├── ROADMAP.md            # สรุปความคืบหน้าการพัฒนาทั้งหมด
├── package.json          # รายการไลบรารีและคำสั่งรันระบบ
└── tsconfig.json         # การตั้งค่ารูปแบบภาษา TypeScript
```
