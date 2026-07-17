# 🍶 Yokayaki Izakaya POS

ระบบ POS ไฮบริดสำหรับร้านอาหารสไตล์อิซากายะขนาดเล็ก (3-4 โต๊ะ) รองรับทั้งพนักงานสั่งผ่านเครื่อง POS หลัก และลูกค้าสแกน QR สั่งอาหารผ่านมือถือตัวเอง

**Stack:** Next.js 16 · React 19 · Supabase (PostgreSQL) · TailwindCSS 4 · TypeScript

> 📋 ดูรายละเอียดความคืบหน้าการพัฒนาที่ [ROADMAP.md](./ROADMAP.md)

## ✨ Features

- 🔐 **PIN Auth** — ระบบล็อกอินพนักงาน Owner/Staff ด้วย PIN 6 หลัก + Auto-Lock 5 นาที
- 🪑 **Table Map** — ผังโต๊ะเรียลไทม์ ซิงค์สถานะจาก Supabase (ว่าง / มีลูกค้า / รอเช็คบิล)
- 🍱 **POS Order Screen** — สั่งอาหาร + หักสต็อก Atomic + Badge สต็อกเหลือน้อย / SOLD OUT
- 🚫 **Void System** — ยกเลิกรายการ (คีย์ผิด = คืนสต็อก / อาหารชำรุด = ตัดสูญเสีย)
- 📱 **QR Customer Portal** — ลูกค้าสแกน Dynamic QR สั่งอาหารผ่านมือถือ (อายุ 2 ชม.)
- 💳 **Checkout & PromptPay QR** — Multi-Payment (เงินสด/โอน/ผสม) + Dynamic PromptPay QR (EMVCo)
- 🎫 **Loyalty Program** — สมัครสมาชิกด้วยเบอร์โทร 10 หลัก, สะสม/ใช้แต้ม
- 🧾 **E-Receipt** — พิมพ์ใบเสร็จดิจิทัลผ่าน `window.print()` รองรับ Thermal Printer 80mm

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

เปิด [http://localhost:3000](http://localhost:3000) สำหรับหน้าจอ POS พนักงาน

**PIN ทดสอบ:**
- Owner: `111111`
- Staff: `222222`

## 📱 ทดสอบ QR Customer Portal (Local Network)

1. เปิดเว็บผ่าน IP เครื่อง (เช่น `http://192.168.1.102:3000`) แทน localhost
2. เข้าโต๊ะและกด **"สร้าง QR ลูกค้า"**
3. หยิบมือถือ (Wi-Fi เดียวกัน) สแกน QR Code เพื่อเปิดหน้าสั่งอาหาร

## 🗄️ Database Setup

รันไฟล์ SQL ใน Supabase SQL Editor ตามลำดับ:
1. `supabase/migrations/20260705_init_schema.sql`
2. `supabase/migrations/20260707_void_order_item.sql`
3. `supabase/migrations/20260707_customer_order_rpc.sql`
4. `supabase/migrations/20260707_happy_hour_and_payment.sql`

## 📄 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_PROMPTPAY_ID=0899999999
```
# yokayaki
