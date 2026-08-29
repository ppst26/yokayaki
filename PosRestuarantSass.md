# 🍶 Yokayaki POS → Enterprise SaaS

> **เอกสารประเมินโปรเจกต์ฉบับสมบูรณ์** — โปรเจกต์นี้คืออะไร มีฟีเจอร์อะไรแล้วบ้าง และต้องเพิ่มอะไรอีกเพื่อยกระดับเป็น Restaurant POS SaaS ระดับ Enterprise
>
> จัดทำ: 2026-08-23 · อ้างอิงโค้ด ณ commit `7d004fa` (2026-08-13)
> เอกสารนี้เขียนจากการสำรวจโค้ดจริงทั้ง repo ไม่ได้อ้างอิงจาก `ROADMAP.md` เดิมซึ่งล้าสมัยแล้ว

---

## 📑 สารบัญ

| ส่วน | หัวข้อ | สำหรับใคร |
|---|---|---|
| 1 | ภาพรวมโปรเจกต์ (Executive Summary) | ทุกคน |
| 2 | ฟีเจอร์ที่มีแล้ว (Feature Inventory) | ทุกคน |
| 3 | ประเมินความพร้อมสู่ SaaS (Readiness Scorecard) | ผู้บริหาร / นักลงทุน |
| 4 | Gap Analysis — สิ่งที่ต้องเพิ่ม | นักพัฒนา |
| 5 | Roadmap สู่ SaaS (9 เฟส) | นักพัฒนา / PM |
| 6 | มุมธุรกิจ — Positioning & Pricing | ผู้บริหาร / นักลงทุน |
| 7 | ภาคผนวก — Schema / RPC / Migrations | นักพัฒนา |

---
---

# 1. ภาพรวมโปรเจกต์ (Executive Summary)

## 1.1 โปรเจกต์นี้คืออะไร

**Yokayaki POS** คือระบบ Point-of-Sale แบบ **ไฮบริด (Hybrid POS)** สำหรับร้านอาหารญี่ปุ่นสไตล์อิซากายะขนาดเล็ก (3–4 โต๊ะ) ที่รับออเดอร์จาก **2 ทิศทางพร้อมกัน**:

1. **Staff Terminal** — พนักงานล็อกอินด้วย PIN 6 หลัก แล้วสั่งอาหารผ่านเครื่อง POS หลักของร้าน
2. **Customer QR Self-Order** — ลูกค้าสแกน QR ประจำโต๊ะด้วยมือถือตัวเอง เปิดเว็บสั่งอาหารได้เอง ไม่ต้องเรียกพนักงาน

ทั้งสองทางส่งออเดอร์เข้า **Kitchen Display System (KDS)** เดียวกันแบบเรียลไทม์พร้อมเสียงแจ้งเตือน และปิดจบที่หน้าเช็คบิลเดียวกันซึ่งรองรับเงินสด / PromptPay QR / จ่ายผสม พร้อมระบบสมาชิกสะสมแต้มและเครื่องมือคำนวณโปรโมชั่นอัตโนมัติ

**สถานะปัจจุบัน:** เป็น **แอปที่ใช้งานจริงได้แล้วสำหรับร้านเดียว (Single-tenant)** — ยังไม่ใช่ SaaS และยังขายให้ร้านอื่นไม่ได้

---

## 1.2 Tech Stack (จริงจาก `package.json`)

| ชั้น | เทคโนโลยี | เวอร์ชัน | หมายเหตุ |
|---|---|---|---|
| Framework | Next.js | `16.2.10` | App Router + Turbopack — แต่ใช้เป็นแค่เปลือกของ SPA |
| UI Library | React / React DOM | `19.2.4` | **ทุกไฟล์เป็น `"use client"`** ไม่มี Server Component ที่ใช้จริง |
| Language | TypeScript | `^5` | strict mode, alias `@/*` |
| Backend | Supabase (PostgreSQL) | `@supabase/supabase-js ^2.110.0` | Database + Realtime + RPC |
| Styling | TailwindCSS | `^4` | PostCSS plugin + `tw-animate-css ^1.4.0` |
| Charts | Recharts | `3.8.0` | ใช้ใน Owner Dashboard |
| Icons | Lucide React | `^1.23.0` | — |
| QR | react-qr-code | `^2.2.0` | Customer QR + PromptPay EMVCo |
| UI utils | clsx, tailwind-merge, CVA | — | `cn()` ใน `lib/utils.ts` |
| Package manager | pnpm | `10.11.0` | ห้ามใช้ npm/yarn |

> ⚠️ **หมายเหตุ:** `@base-ui/react ^1.6.0` และ `shadcn ^4.14.1` อยู่ใน dependencies แต่ **ไม่เคยถูก import ที่ไหนเลย** — UI primitives ใน `components/ui/` เขียนเองด้วยมือทั้งหมด

---

## 1.3 ขนาดโปรเจกต์จริง (ยืนยันด้วยคำสั่ง ไม่ใช่ประมาณ)

| ตัวชี้วัด | ค่าจริง | วิธียืนยัน |
|---|---|---|
| โค้ด TypeScript / TSX | **~14,300 บรรทัด** ใน 70+ ไฟล์ | `git ls-files "*.tsx" "*.ts" \| xargs wc -l` |
| ไฟล์ทั้งหมดใน repo | 211 ไฟล์ | `git ls-files \| wc -l` |
| SQL Migrations | **25 ไฟล์** | `ls supabase/migrations/*.sql \| wc -l` |
| ตารางฐานข้อมูล | **15 ตาราง** | `grep "CREATE TABLE"` → uniq |
| RPC Functions | **7 ฟังก์ชัน** | `grep "CREATE OR REPLACE FUNCTION"` → uniq |
| โมดูลนำทาง (`NavTab`) | **9 โมดูล** | `components/common/SidebarNav.tsx:21-30` |
| Routes | **2 routes** เท่านั้น | `app/page.tsx`, `app/customer/[session_id]/page.tsx` |
| Git commits | **214 commits** (2026-07-05 → 2026-08-13) | `git rev-list --count HEAD` |
| เอกสารภายใน | 18 specs + 34 plans | `docs/superpowers/` |
| **Test / CI** | **0 test, 0 pipeline** | ไม่มี `.github/`, ไม่มี test runner |
| **Deploy config** | **ไม่มี** | ไม่มี Dockerfile / vercel.json |

> 📌 ตัวเลขเหล่านี้ต่างจาก `ROADMAP.md` และ `AGENTS.md` อย่างมีนัยสำคัญ — ดูหัวข้อ 1.5

---

## 1.4 สถาปัตยกรรมปัจจุบัน

```
┌────────────────────────────────────────────────────────────────────┐
│                      เบราว์เซอร์ (100% Client)                       │
│                                                                     │
│   ┌──────────────────────┐        ┌───────────────────────────┐   │
│   │  /  (Staff POS)      │        │ /customer/[session_id]    │   │
│   │  ─ PinPad            │        │  ─ Mobile QR Portal       │   │
│   │  ─ TableMap (shell)  │        │  ─ 4 tabs + 5 channels    │   │
│   │    └ 9 tabs ภายใน     │        │  ─ เรียกเช็คบิลเองได้        │   │
│   └──────────┬───────────┘        └────────────┬──────────────┘   │
│              └──────────┬──────────────────────┘                   │
│                         │                                          │
│              lib/supabase.ts  (anon key, 6 บรรทัด)                  │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          │  ⚠️ ไม่มี Server Tier คั่นกลางเลย
                          │  (ไม่มี Route Handler / Server Action / middleware)
                          ▼
┌────────────────────────────────────────────────────────────────────┐
│                          Supabase Cloud                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  PostgREST   │  │  Realtime    │  │  PostgreSQL              │ │
│  │  (REST auto) │  │  (5 tables)  │  │  ─ 15 tables             │ │
│  └──────────────┘  └──────────────┘  │  ─ 7 RPC (SEC. DEFINER)  │ │
│                                       │  ─ RLS: USING(true) 🔴   │ │
│                                       │  ─ 2 indexes เท่านั้น      │ │
│                                       │  ─ 0 triggers             │ │
│                                       └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

**ข้อสังเกต 4 ข้อที่กำหนดทุกอย่างในบท Gap Analysis:**

1. **ไม่มี server tier เลย** — App Router ถูกใช้เป็นเปลือกของ SPA เท่านั้น ไม่มี Route Handler, Server Action, middleware หรือ service-role client ที่ไหนในโปรเจกต์
2. **Browser คุยกับ Postgres โดยตรง** ผ่าน PostgREST ด้วย anon key ที่ฝังอยู่ใน JavaScript bundle
3. **ไม่มี multi-tenancy แม้แต่คอลัมน์เดียว** — grep `tenant_id|org_id|branch_id|store_id` ทั่ว 25 migrations ได้ **0 hits**
4. **Auth เป็น PIN-hash ตัวเอง ไม่ใช่ Supabase Auth** — `auth.uid()` ปรากฏ **0 ครั้ง** ในทุก migration; session เก็บใน `localStorage`

---

## 1.5 ⚠️ เอกสารเดิมขัดกับโค้ดจริง

`ROADMAP.md` อัปเดตล่าสุด **2026-07-20** แต่โค้ดพัฒนาต่อถึง **2026-08-13** และมี 34 plan docs ที่ไม่เคยถูกสรุปกลับเข้า roadmap

### ตัวเลขที่ไม่ตรง

| หัวข้อ | `ROADMAP.md` บอก | `AGENTS.md` บอก | **ของจริง** |
|---|---|---|---|
| ตารางฐานข้อมูล | 10 | 12 | **15** |
| Migrations | 7 | 14 | **25** |
| RPC Functions | 4 | 4 | **7** |
| Components | flat 8 ไฟล์ | flat 11 ไฟล์ | **70+ ไฟล์ ใน 10 โฟลเดอร์ย่อย** |

### ฟีเจอร์ที่ทำเสร็จแล้วแต่ไม่มีในเอกสารไหนเลย

PromoManager + promotion engine · MenuManager · EmployeeManager · Purchase Orders · ระบบคูปอง · Dark mode · Mobile bottom nav + drawer · Pagination · Web Audio notification · Customer เรียกเช็คบิลเอง · PIN lockout · Split cash/promptpay · Recharts dashboard · Partial void · Menu image & unit

### 🔴 ข้อขัดแย้งที่กระทบธุรกิจโดยตรง 3 จุด

| # | เอกสารบอก | โค้ดจริง | ผลกระทบ |
|---|---|---|---|
| 1 | `ROADMAP.md:182` — "role = 'staff' ไม่เห็นแดชบอร์ด/สต็อก/**ประวัติการขาย**" | `SidebarNav.tsx` แสดง tab `history` ให้ staff **โดยไม่มี `isOwner` guard** และ `TableMap.tsx` ก็ไม่มี guard | **พนักงานทั่วไปเห็นยอดขายทั้งวันของร้าน** ผิดจากที่ออกแบบไว้ |
| 2 | `ROADMAP.md:197` — Phase 10 เปลี่ยนเป็น "ทุก 100 บาท = 10 แต้ม" | `CheckoutScreen.tsx` ยังคำนวณ `Math.floor(netAmount / 25)` | **อัตราแต้มจ่ายจริงต่างจากที่ประกาศ** (25฿=1แต้ม vs 10฿=1แต้ม) |
| 3 | `ROADMAP.md:99` — Phase 4 "Happy Hour: เบียร์สด 120→80, ยากิโทริ 80→50 (17:00-19:00)" ✅ | `menu_items.happy_hour_price` **แก้จาก UI ไม่ได้** (`MenuItemModal` ไม่มีช่องนี้) และ **ไม่เคยถูกอ่านตอนสั่ง** (`p_unit_price` = `item.price` เสมอ) | Happy Hour ที่ทำงานจริงคือ **promotion `start_time`/`end_time` ที่คำนวณตอน checkout** ซึ่งเป็นคนละกลไก — คอลัมน์ `happy_hour_price` เป็น dead column |

> **ข้อเสนอ:** ถือเอกสารฉบับนี้เป็น source of truth แทน `ROADMAP.md` และอัปเดต `AGENTS.md` ตามภาคผนวก (ส่วนที่ 7)

---
---

# 2. ฟีเจอร์ที่มีแล้ว (Feature Inventory)

**สรุปตัวเลข:** 14 โมดูล · ~65 ความสามารถย่อย · 15 ตาราง · 7 RPC · 2 routes

**สัญลักษณ์:** ✅ ครบใช้งานได้ · ⚠️ ใช้ได้แต่มีข้อจำกัดสำคัญ · 🔴 ทำงานได้แต่ไม่ปลอดภัย/มีความเสี่ยงข้อมูล · ❌ ยังไม่มี

---

## 2.1 🔐 Auth & RBAC

**ไฟล์:** `context/AuthContext.tsx` (281) · `components/common/PinPad.tsx` (184)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| PIN 6 หลัก + auto-submit | ✅ | คีย์แพดตัวเลข, จุดแสดงสถานะ, shake animation เมื่อผิด |
| SHA-256 dual implementation | ✅ | ใช้ Web Crypto ถ้ามี ไม่งั้น fallback เป็น **pure-JS SHA-256 เขียนเอง** (`AuthContext.tsx:39-82`) เพื่อให้ล็อกอินได้บน HTTP ผ่าน LAN IP |
| Brute-force lockout | ⚠️ | ผิด 3 ครั้ง → ล็อก 3 นาที + countdown เต็มจอ — แต่เก็บใน `localStorage` ผู้ใช้ล้างเองได้ |
| Auto-lock เมื่อไม่ใช้งาน | ✅ | 5 นาทีไม่มี mousedown/keydown/touchstart/scroll → logout |
| Audio unlock | ✅ | ทุก activity event เรียก `unlockAudio()` เพื่อผ่าน browser autoplay policy |
| RBAC 2 ระดับ (owner / staff) | 🔴 | เช็คด้วย `employee?.role === 'owner'` ฝั่ง client ล้วน — session ใน `localStorage` แก้เป็น `{"role":"owner"}` ได้ด้วยมือ |
| กู้คืน PIN ที่ลืม | ❌ | ไม่มีเลย |

---

## 2.2 🪑 Floor / Table Map (app shell)

**ไฟล์:** `components/common/TableMap.tsx` (312) · `TableCard.tsx` (111) · `SidebarNav.tsx` (681)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| ผังโต๊ะ realtime 3 สถานะ | ✅ | `vacant` (ขาว/เขียว) · `occupied` (เหลืองอำพัน) · `checking_out` (แดง + pulse + กระดิ่งเด้ง) |
| Tab router 9 โมดูล | ⚠️ | **TableMap คือทั้งแอป** — ทุก "หน้าจอ" เป็น tab ข้างใน ไม่ใช่ route (ไม่มี deep-link / back button / URL state) |
| Realtime audio notification | ✅ | โต๊ะเปลี่ยนเป็น `checking_out` → `playCheckBillSound()`; `order_items` INSERT → `playNewOrderSound()` — **ได้ยินทุกหน้าจอในแอป** |
| Action Selector Modal | ✅ | กดโต๊ะที่มีลูกค้า → เลือก "สั่งอาหารเพิ่ม" / "ชำระเงิน" |
| บล็อกเช็คบิลเมื่อของค้างครัว | ✅ | realtime นับ `pending` items → ปุ่มชำระเงิน disable พร้อมข้อความ "ค้างครัว (N รายการ)" |
| Sidebar 4 รูปแบบพร้อมกัน | ⚠️ | mobile header + slide-over drawer + bottom nav 4 ปุ่ม + desktop sidebar — **markup ซ้ำ 3 ชุด ~450 บรรทัด** แก้ทีต้องแก้ 3 ที่ และ label ไม่ตรงกัน ("ประวัติการขาย" / "ออเดอร์ประจำวัน" / "ออเดอร์") |
| Live badges บน nav | ✅ | จำนวนโต๊ะที่มีของค้างครัว (แดง pulse) และโต๊ะที่เรียกเช็คบิล (rose bounce) |
| Dark / Light mode toggle | ✅ | `localStorage['yokayaki_theme']` + fallback `prefers-color-scheme` |
| Error boundary | ❌ | ไม่มี — child throw ครั้งเดียวแอปขาวทั้งหน้า |

---

## 2.3 🍱 POS Order Screen (Staff)

**ไฟล์:** `components/order/` — `POSOrderScreen.tsx` (414) · `MenuGrid.tsx` (133) · `CartPanel.tsx` (322) · `SpecialNoteModal.tsx` (95) · `VoidItemModal.tsx` (153) · `CustomerQRModal.tsx` (54)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| เมนู + แท็บหมวดหมู่ | ✅ | category pills เลื่อนแนวนอน, grid 2/3/4 คอลัมน์, รูป + ราคา |
| Urgency badge / SOLD OUT | ✅ | "เหลือ N" เมื่อสต็อก ≤ 3 · "หมด" + รูป grayscale + ราคาขีดฆ่า เมื่อ = 0 |
| ตะกร้า + แก้จำนวน | ✅ | ± ต่อรายการ, ลบ, ยอดรวม, expand-to-fullscreen บนมือถือ |
| โน้ตพิเศษ | ⚠️ | textarea + 6 ปุ่มลัด — **ปุ่มลัด append อย่างเดียว ลบไม่ได้** และ `addToCart` merge ด้วย `id` เท่านั้น **ไม่ดูโน้ต** → เมนูเดียวกัน 3 ชิ้นใช้โน้ตเดียวกันหมด (ต่างจากหน้าลูกค้าที่ merge ด้วย `id+notes` ถูกต้อง) |
| ส่งออเดอร์เข้าครัว | 🔴 | loop `rpc('place_order_item')` **ทีละรายการ ไม่ atomic** — ล้มที่รายการที่ 3 จาก 5 → รายการ 1-2 บันทึกไปแล้วแต่ตะกร้าไม่ถูกล้าง → กดซ้ำ = **สั่งซ้ำ** |
| Void รายการ (partial) | ✅ | เลือกจำนวน + 5 เหตุผล + ข้อความเอง |
| รายการที่ส่งครัวแล้ว | ✅ | สถานะ `กำลังปรุง`/`เสิร์ฟแล้ว` + ปุ่ม void ต่อรายการ |
| สร้าง QR ลูกค้า | ✅ | insert `qr_sessions` (หมดอายุ +2 ชม.) → modal QR level-H |
| Happy Hour ตอนสั่ง | ❌ | **ไม่มีเลย** — `p_unit_price` = `item.price` เสมอ; interface `MenuItem` ไม่มีแม้แต่ field `is_happy_hour` |

---

## 2.4 📱 Customer QR Portal

**ไฟล์:** `app/customer/[session_id]/page.tsx` (**1,235 บรรทัดไฟล์เดียว** — หน้าจอเดียวที่ยังไม่ถูกแตกย่อย)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| ตรวจสอบ session | ✅ | ต้องมีจริง + `status='active'` + ยังไม่เกิน `expired_at` ไม่งั้นแสดงหน้า "QR หมดอายุ" |
| **5 realtime channels พร้อมกัน** | ✅ | `tables` · `qr_sessions` · `orders` · `order_items` (กำลังปรุง→เสิร์ฟแล้ว) · `menu_items` (สต็อก/ราคาสด) |
| Tab 1 — หน้าหลัก | ✅ | แบนเนอร์ต้อนรับ + เลขโต๊ะ, การ์ดสถานะออเดอร์สด, พรีวิวโปรโมชั่น 3 อัน |
| Tab 2 — สั่งอาหาร | ✅ | category chips, การ์ด 2 คอลัมน์, SOLD OUT / "เหลือ N จาน", stepper inline, **จำกัดจำนวนตาม `item.stock`** |
| Tab 3 — สั่งแล้ว | ✅ | แยกสีตามสถานะ (amber กำลังปรุง / emerald เสิร์ฟแล้ว / rose ยกเลิก ขีดฆ่า), ยอดรวมไม่นับที่ void |
| **เรียกเช็คบิลเอง** | 🔴 | ปุ่ม disable จนอาหารเสิร์ฟครบ → modal ยืนยัน → **เขียน `tables.status = 'checking_out'` ตรงๆ จาก anon client** (ไม่ผ่าน RPC เหมือน mutation อื่น) → ฝั่งพนักงานได้ยินกริ่ง + โต๊ะกระพริบแดง |
| ยกเลิกการเรียกเช็คบิล | ✅ | ปุ่มย้อนกลับเป็น `occupied` |
| Tab 4 — โปรโมชั่น | ✅ | รายการเต็ม + badge ประเภท + ช่วงเวลา Happy Hour + **รูปแบนเนอร์** (`promo.image_url`) |
| ตะกร้า bottom drawer | ✅ | key ด้วย `id + notes` **ถูกต้อง** — เมนูเดียวกันโน้ตต่างกันแยกรายการ |
| โน้ต 6 ปุ่มลัด | ✅ | **toggle เปิด/ปิดได้ถูกต้อง** (ดีกว่าฝั่ง staff) |
| หน้าขอบคุณ | ✅ | ทริกเกอร์จาก 3 สัญญาณ (table vacant / session expired / order completed) |
| ส่งออเดอร์ | 🔴 | loop RPC เหมือนฝั่ง staff — นับ error ได้แต่**ไม่ล้างตะกร้า** → สั่งซ้ำได้ |
| ต่ออายุ session อัตโนมัติ | ❌ | ไม่มี — มื้อเย็น 2 ชม. อาจหมดอายุกลางคันโดยไม่เตือน |
| Happy Hour / โปรตอนสั่ง | ❌ | ราคาที่ลูกค้าเห็นและส่งคือ `item.price` เสมอ; Tab โปรฯ เป็นข้อมูลอย่างเดียว |
| i18n | ❌ | ไทยล้วน hardcode |

---

## 2.5 👨‍🍳 Kitchen Display System (KDS)

**ไฟล์:** `components/kitchen/KitchenScreen.tsx` (295) · `KitchenOrderCard.tsx` (254) · `lib/audioNotifier.ts` (115)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| จัดกลุ่มตามโต๊ะ | ✅ | 1 การ์ด = 1 โต๊ะ เรียงจากโต๊ะที่รอนานสุดก่อน |
| Wait timer แบบไล่ระดับ | ✅ | recompute ทุก 30 วิ · ปกติ → **≥8 นาที** เหลืองอำพัน → **≥15 นาที** แดงเข้ม pulse + badge เด้ง |
| เสียงแจ้งเตือนสังเคราะห์เอง | ✅ | ไม่ใช้ไฟล์เสียง — `playNewOrderSound()` = 2 โทน sine G5→C6; `playCheckBillSound()` = 3 โทน triangle E5→A5→C6 (Web Audio API) |
| ปุ่มเปิด/ปิดเสียง | ⚠️ | toggle ได้ แต่**การกดปุ่มทำให้ realtime channel unsubscribe แล้ว subscribe ใหม่ทั้งหมด** และค่าไม่ถูกจำข้ามการรีโหลด |
| เสิร์ฟรายจาน / ทั้งโต๊ะ | ✅ | optimistic update + rollback เมื่อ error |
| Void จากหน้าครัว | ⚠️ | stepper + 4 เหตุผล + ข้อความเอง — **รายการเหตุผลไม่ตรงกับฝั่ง POS (5 เหตุผล)** |
| แสดงโน้ต + หน่วย | ✅ | 📝 prefix + `unit` (default "จาน") |
| Recall / undo serve | ❌ | ไม่มี |
| แยกสถานี (station routing) / KOT | ❌ | ไม่มี — ครัวเดียวจอเดียว |
| Bump bar / keyboard shortcut | ❌ | ไม่มี |

---

## 2.6 💳 Checkout & Payment

**ไฟล์:** `components/checkout/` — `CheckoutScreen.tsx` (698) · `OrderSummaryCard.tsx` (205) · `CRMMemberCard.tsx` (134) · `CouponInputCard.tsx` (86) · `PaymentCard.tsx` (144) · `PromptPayQRModal.tsx` (52) · `ReceiptPrintView.tsx` (196)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| บล็อกเช็คบิลเมื่อของค้างครัว | ✅ | แบนเนอร์เตือน + ปุ่ม disable + guard ซ้ำใน `processPayment` |
| **Promotion auto-apply engine** | ✅ | `autoApplyPromotions()` (`CheckoutScreen.tsx:192-266`) คำนวณใหม่ทุกครั้งที่ยอดเปลี่ยน:<br>• `percentage` — ทั้งบิล / เฉพาะเมนู / เฉพาะช่วงเวลา (**เทียบกับ `created_at` ของแต่ละรายการ** = Happy Hour ตัวจริง)<br>• `fixed` — auto ถ้าไม่มีคูปอง / ต้อง redeem ถ้ามีโค้ด<br>• `buy_x_get_y` — `freeSets = floor(qty / (buy+free))` + คืน `freeItems[]`<br>• เช็ค `start_date`/`end_date` และ `min_order_amount` |
| Stacking rule / cap | ❌ | โปรทุกตัว**บวกกันหมดโดยไม่มีเพดาน**และไม่มีการแก้ conflict |
| คูปอง | ⚠️ | match ไม่สนตัวพิมพ์ + ข้อความ error ยอดขั้นต่ำ — แต่**โค้ดไม่ unique** (เอาตัวแรกที่เจอ) และไม่มี usage limit |
| ระบบสมาชิก + ใช้แต้ม | ⚠️ | ค้นด้วยเบอร์ 10 หลัก, redeem ≤ `min(points, subtotal)` อัตรา 1 แต้ม = 1 บาท, สมัคร inline ได้ — **แต้มที่ได้ = `Math.floor(netAmount / 25)` ขัดกับ ROADMAP** |
| Quick Add Member | ✅ | modal เบอร์+ชื่อ, ตรวจซ้ำอัตโนมัติ, พรีวิว "+N แต้ม จากบิลนี้" |
| จ่ายเงินสด / โอน / ผสม | ✅ | ปุ่มลัด +100/+500/+1000 / เต็มจำนวน / ล้าง · อนุมานวิธีจ่ายอัตโนมัติ · แสดงเงินทอนและยอดค้างโอนสด |
| **PromptPay EMVCo QR** | ⚠️ | **เขียน payload builder + CRC-16/CCITT-FALSE เองทั้งหมด** — normalize `0XXXXXXXXX`→`0066XXXXXXXXX`, tag 01/02 ตามความยาว, field 29/53(764 THB)/54/58(TH)/59, ยอดใน QR = ยอดที่ต้องโอนจริง<br>🔴 **ถ้า `NEXT_PUBLIC_PROMPTPAY_ID` ไม่ถูกตั้ง จะ fallback เป็น `'0899999999'` เงียบๆ — เงินเข้ากระเป๋าคนแปลกหน้า**<br>ชื่อร้าน `YOKAYAKI` + country/currency hardcode |
| ใบเสร็จ Thermal 80mm | ✅ | `print:w-[80mm]` monospace, เลขบิล/โต๊ะ/วันที่/พนักงาน, โน้ตย่อหน้า `*`, โปรพร้อม `└ ฟรี: X`, แต้มใช้/ได้, breakdown การจ่าย, `window.print()` |
| ปิดบิล | 🔴 | `rpc('complete_checkout', {...11 params})` — **ทุกยอดเงินคำนวณฝั่ง browser แล้วส่งเป็นพารามิเตอร์** |
| แยกบิลตามคน (split by seat) | ❌ | ไม่มี |
| Void ทั้งบิล / reprint จากประวัติ | ❌ | ไม่มี |
| VAT / Service charge | ❌ | ไม่มีเลย |

---

## 2.7 🍽️ Menu Manager (Owner)

**ไฟล์:** `components/menu/MenuManager.tsx` (450) · `MenuItemModal.tsx` (240)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| CRUD เมนู | ✅ | เพิ่ม/แก้/ลบ + modal ยืนยันลบ (บอกชัดเมื่อลบไม่ได้เพราะมีออเดอร์อ้างอยู่ — FK `RESTRICT`) |
| ค้นหา + กรองหมวดหมู่ | ⚠️ | `CATEGORIES` เป็น **array hardcode ในคอมโพเนนต์** ไม่ได้อ่านจาก DB → หมวดที่เพิ่มตรง DB ไม่ขึ้นเป็น pill |
| Pagination | ✅ | client-side (page + page size, reset เมื่อเปลี่ยนตัวกรอง) |
| Inline stock stepper | ✅ | −1 / ช่องแก้ตัวเลข / +1 ในตาราง พร้อม optimistic UI |
| UnitCombobox | ✅ | พิมพ์เองได้ + รายการแนะนำ (จาน/ชิ้น/แก้ว/ขวด/ถ้วย/ชุด/อัน/กก./ลิตร) |
| **แก้ Happy Hour / stock flag** | ❌ | **modal ไม่มีช่องเหล่านี้เลย** ทั้งที่อยู่ใน `EMPTY_FORM` และ payload → เมนูใหม่ถูกบังคับเป็น `stock: 20, is_stock_tracked: true, is_happy_hour: false` เสมอ → **Happy Hour เข้าถึงจาก UI ไม่ได้** |
| อัปโหลดรูป | ⚠️ | ใส่ URL อย่างเดียว ไม่มี Supabase Storage; ใช้ `<img>` ดิบไม่ใช่ `next/image` |
| Sort / bulk action / active flag | ❌ | ไม่มี — ปิดขายชั่วคราวไม่ได้ ต้องลบอย่างเดียว |

---

## 2.8 📦 Purchase Orders (Owner — tab ชื่อ "สต็อก")

**ไฟล์:** `components/stock/StockManager.tsx` (27 — แค่ wrapper) · `IngredientPurchaseManager.tsx` (**1,128**)

> ⚠️ **ชื่อ tab ทำให้เข้าใจผิด** — นี่ไม่ใช่ระบบจัดการสต็อก แต่เป็น **สมุดบันทึกใบสั่งซื้อวัตถุดิบ (PO ledger)** สต็อกที่ขายจริงอยู่ที่ `MenuManager`

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| CRUD ใบสั่งซื้อ | 🔴 | header (`purchase_orders`) + รายการย่อย (`item_ingredients`)<br>**การแก้ไขทำลายข้อมูล**: update header → `DELETE` รายการทั้งหมด → insert ใหม่ — พังระหว่างขั้น 2-3 = **รายการหายถาวร** (การลบก็ไม่ atomic เช่นกัน) |
| ตัวกรองวันที่ 7 แบบ | ✅ | ทั้งหมด / วันนี้ / 7 / 30 / 90 / 180 วัน / กำหนดเอง |
| ค้นหา | ✅ | เลข `PO-0001`, ชื่อผู้ซื้อ, หมายเหตุ |
| Accordion drill-down | ✅ | กางดูรายการย่อยแบบ lazy fetch + แก้/ลบต่อ PO |
| Master data แบบ dynamic | ⚠️ | วัตถุดิบ 14 ค่า + หน่วย 12 ค่า default merge กับค่าใน DB และชื่อเมนูทั้งหมด + ปุ่ม "+ เพิ่มใหม่" — **ค่าใหม่อยู่ใน state เท่านั้น ปิด modal โดยไม่บันทึก = หาย** |
| Responsive form | ✅ | มือถือเป็นการ์ดซ้อน / เดสก์ท็อป grid 5 คอลัมน์ |
| **เชื่อมกับ `menu_items.stock`** | ❌ | **ไม่เชื่อมเลย** — ซื้อวัตถุดิบไม่กระทบสต็อกที่ขายได้ และไม่มี recipe/BOM → **คิด COGS รายจานไม่ได้** |
| `price_per_unit` | ⚠️ | อยู่ใน interface แต่**ไม่เคยถูกบันทึกลง DB**; ตอนแก้สร้างใหม่จาก `cost / quantity` (เสียความละเอียด) |
| Server-side filter / pagination | ❌ | ดึง PO **ทั้งหมด** มา filter และรวมยอดใน JS |
| Realtime | ❌ | ต้องกดรีเฟรชเอง |

---

## 2.9 🎯 Promo Manager (Owner)

**ไฟล์:** `components/promo/PromoManager.tsx` (823)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| 3 ประเภทโปรโมชั่น | ✅ | ส่วนลด · คูปอง · ซื้อ-แถม เลือกด้วย icon tile |
| เปอร์เซ็นต์ / บาท | ✅ | segmented control → `type: 'percentage' \| 'fixed'` |
| ผูกกับเมนูเฉพาะ | ✅ | CustomSelect ค้นหาได้ + default "ทุกเมนูในร้าน" |
| **Happy Hour time window** | ✅ | สวิตช์เปิด → `<input type="time">` เริ่ม/สิ้นสุด — **นี่คือกลไก Happy Hour ที่ทำงานจริง** |
| ยอดขั้นต่ำ + โค้ดคูปอง | ✅ | auto-uppercase, monospace |
| Toggle active/inactive | ✅ | inline + จุด pulse; การ์ด inactive opacity 65% + grayscale |
| **ช่อง `image_url`** | ❌ | **ไม่มีในฟอร์ม** ทั้งที่คอลัมน์มีอยู่และ**หน้าลูกค้าแสดงรูปแบนเนอร์โปรฯ** → ตั้งรูปจากแอปไม่ได้เลย |
| **ช่อง `start_date` / `end_date`** | ❌ | **ไม่มีในฟอร์ม** ทั้งที่อ่าน+ส่งตอน save และ checkout ใช้กรองจริง → ตั้งช่วงแคมเปญได้แค่แก้ตรง DB |
| Validation | ❌ | ไม่เช็ค % ≤ 100, ไม่เช็คค่า > 0, ไม่เช็ค end_time > start_time; คูปองค่าว่างบันทึกเป็น 0 |
| Usage limit / per-customer limit | ❌ | ไม่มี |

---

## 2.10 🧾 Sales History (Owner + Staff ⚠️)

**ไฟล์:** `components/sales/SalesHistory.tsx` (436) · `SalesSummaryCards.tsx` (85) · `ClosedBillTable.tsx` (126) · `BillDetailModal.tsx` (346) · `VoidLogsTable.tsx` (79)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| KPI 4 ใบ | ✅ | ยอดสุทธิ · ส่วนลดรวม · จำนวนบิล · จำนวน void + มูลค่า |
| 2 sub-tab | ⚠️ | "รายการการขาย" / "ประวัติการ Void" — label sub-tab hardcode "วันนี้" แม้เลือกเมื่อวาน |
| การ์ดบิล | ✅ | `ORD-n`, โต๊ะ, เวลา, ไอคอนวิธีจ่าย, chip "ใช้โปรโมชั่น (N)", ยอดสุทธิ, "ประหยัด -X ฿" |
| Bill detail modal | ✅ | รายการ + โน้ต + โปร (รวมโค้ดคูปองและของแถม) + breakdown การจ่าย + ชื่อสมาชิก |
| Void log | ✅ | เวลา / เมนู / จำนวน / มูลค่า / เหตุผล / พนักงาน (อ่านอย่างเดียว ย้อนกลับไม่ได้) |
| **ช่วงเวลา** | ❌ | **วันนี้ / เมื่อวาน เท่านั้น** ไม่มีช่วงกำหนดเอง ไม่มี export CSV ไม่มี reprint |
| การ join ข้อมูล | ⚠️ | **join ด้วยมือใน JS 4 ขั้น** ยิง 4 round-trip ต่อการรีเฟรช และดึง `loyalty_members` **ทั้งตาราง** มาทำ name map |
| สิทธิ์เข้าถึง | 🔴 | **staff เห็นด้วย** ขัดกับ `ROADMAP.md:182` |

---

## 2.11 🎫 Loyalty CRM (Owner) 

**ไฟล์:** `components/loyalty/LoyaltyManager.tsx` (708) · `MemberInfoCard.tsx` (99) · `PointsHistoryModal.tsx` (149)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| การ์ดสถิติ | ✅ | จำนวนสมาชิกรวม · แต้มคงค้างทั้งระบบ |
| ค้นหา + pagination | ⚠️ | ค้นด้วยชื่อ/เบอร์ — **client-side ทั้งหมด โหลดสมาชิกทุกคนมาก่อน** |
| หน้ารายละเอียดสมาชิก | ✅ | ชื่อ/เบอร์/วันสมัคร/แต้ม + ปุ่มแก้/ปรับแต้ม/ลบ |
| ประวัติการซื้อ | ✅ | ทุกบิลของเบอร์นั้น: `ORD-n (โต๊ะ N)`, ยอด, วันเวลา, วิธีจ่าย, `+N แต้ม` / `ใช้ N แต้ม` |
| ปรับแต้มด้วยมือ | 🔴 | เพิ่ม/ลด + 5 เหตุผลสำเร็จรูป + ข้อความเอง<br>**เขียน 2 ครั้งไม่ atomic**: update `points` → insert `points_logs` — ถ้า log พังจะ `console.error` เฉยๆ **ยอดแต้มเปลี่ยนโดยไม่มีบันทึก = รูโหว่ในตัว audit log เอง**<br>อ่าน-แก้-เขียนโดยไม่มี lock → checkout พร้อมกันทำแต้มหาย |
| Audit log แต้ม | ✅ | แสดง +/− สี, เหตุผล, ใครทำ, เมื่อไหร่ |
| ลบสมาชิก | ⚠️ | ไม่ล้าง `points_logs` และไม่ null `payments.phone_number` |
| Tier / วันเกิด / import-export / merge | ❌ | ไม่มี (ทั้งที่มีเหตุผลสำเร็จรูป "โปรโมชั่นวันเกิด") |

---

## 2.12 📊 Owner Dashboard

**ไฟล์:** `components/dashboard/` — `OwnerDashboard.tsx` (112) · `DateFilterBar.tsx` (89) · `TopKPICards.tsx` (158) · `BusinessSpotlight.tsx` (260) · `SalesChart.tsx` (255) · `BusinessKPIs.tsx` (120) · `PromoActivityStream.tsx` (153) · `TopDishes.tsx` (128) · `lib/useDateFilter.ts` (89)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| ตัวกรองช่วงวันที่ | ⚠️ | วันนี้ / เมื่อวาน / สัปดาห์นี้ (เริ่มจันทร์) / เดือนนี้ / กำหนดเอง — **`useDateFilter` มี `3_months` และ `6_months` แต่ `DateFilterBar` ไม่ render = dead code** |
| KPI หลัก | ⚠️ | ยอดขายสุทธิ (+ gross และส่วนลด) · **"กำไรประมาณการ" = รายได้ − ยอดจัดซื้อในช่วงนั้น** ไม่ใช่ COGS ของที่ขายจริง → restock ก้อนใหญ่ครั้งเดียวทำให้กำไรติดลบ |
| Payment channel breakdown | ✅ | รวม `cash_amount`/`promptpay_amount` จริง + fallback สำหรับบิลเก่า, แถบสัดส่วนซ้อน + % + จำนวนบิล |
| **SalesChart adaptive** | ✅ | Recharts ปรับ bucket อัตโนมัติ: ≤2 วัน → รายชั่วโมง 17:00–23:00 · ≤7 วัน → 7 วันย่อภาษาไทย · >7 วัน → รายวัน scroll แนวนอนเมื่อ >10 แท่ง · ไฮไลต์แท่งสูงสุด · แกน Y ย่อเป็น `k` |
| Business KPIs | ⚠️ | สมาชิกรวม (**ไม่สนใจช่วงวันที่ — all-time เสมอ** ทั้งที่อยู่ในแดชบอร์ดที่กรองวันที่) · จำนวนบิล · จำนวนชิ้นที่ขาย |
| Promo activity stream | ✅ | ส่วนลดรวม + อันดับโปรที่ถูกใช้ (ทอง/เงิน/ทองแดง) |
| Top dishes | ⚠️ | 8 อันดับตามจำนวน + แถบสัดส่วน — **emoji เป็นค่าตามตำแหน่ง ไม่ได้ผูกกับเมนูจริง** |
| ประสิทธิภาพ | 🔴 | **6 คอมโพเนนต์ยิง query แยกกัน ~9 round-trip ต่อการเปลี่ยนวันที่** และหลายตัวดึง `payments` ซ้ำ · ไม่มี cache · ไม่มี aggregate RPC/view · รวมยอดใน JS จาก raw rows ทั้งหมด |
| **Timezone** | 🔴 | `payments` กรองด้วย `toISOString()` (**UTC**) แต่ `item_ingredients` ใช้ local date → **ร้านที่ UTC+7 บิลตอนดึกตกไปวันถัดไป รายได้กับต้นทุนคนละวัน** |
| เทียบช่วงก่อนหน้า / export / realtime | ❌ | ไม่มี |

---

## 2.13 👥 Employee Manager (Owner)

**ไฟล์:** `components/EmployeeManager.tsx` (745 — ไฟล์เดียวที่ยังไม่ถูกย้ายเข้าโฟลเดอร์ย่อย)

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| การ์ดสรุป | ✅ | จำนวนรวม / Owner / Staff |
| Realtime | ✅ | subscribe `employees` |
| เพิ่มพนักงาน | 🔴 | ชื่อ + role + PIN + ยืนยัน PIN → hash ฝั่ง client → `rpc('add_employee')`; คืน `-1` = PIN ซ้ำ · **RPC ไม่มี authorization check เลย** |
| แก้ไข | 🔴 | ส่งเฉพาะ field ที่เปลี่ยนผ่าน `rpc('update_employee')` · **RPC ไม่มี authorization check** |
| Step-up authorization | 🔴 | เปลี่ยน role/PIN ต้องกรอก Owner PIN → **verify ด้วย `.eq('pin_hash', hash)` จาก browser = PIN oracle** ใช้ enumerate PIN ทั้ง 10⁶ ได้ |
| ลบ | ✅ | `rpc('delete_employee')` — **RPC เดียวในระบบที่เช็คสิทธิ์จริงใน DB** (ต้องเป็น owner, ห้ามลบตัวเอง) |
| กันลบ/ลดสิทธิ์ owner คนสุดท้าย | ❌ | ไม่มี — ห้ามแค่ลบตัวเอง |

---

## 2.14 🎨 UX / Design System

| ฟีเจอร์ | สถานะ | รายละเอียด |
|---|:--:|---|
| Dark / Light theme | ✅ | toggle ใน SidebarNav + `localStorage` + `prefers-color-scheme` (หน้าลูกค้าเป็น light อย่างเดียว) |
| Typography scale | ⚠️ | `app/globals.css` นิยาม utility class 17 ตัว (`.text-display`, `.text-h1` … `.text-price`) + `.badge-pill` + drawer animation — **adoption ยังไม่ทั่ว** หลายคอมโพเนนต์ยังใช้ `text-xs font-black` ดิบ |
| Font | ✅ | Noto Sans Thai (300–700) + Geist + Geist Mono ผ่าน `next/font/google` |
| Viewport lock | ✅ | `maximumScale: 1, userScalable: false` เหมาะกับแท็บเล็ต POS |
| Security headers | ✅ | `next.config.ts` — `X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin` |
| `allowedDevOrigins` | ⚠️ | **hardcode LAN IP 3 ค่า** (`192.168.1.144/104/102`) |
| UI primitives | ✅ | เขียนเอง 7 ตัว: button (CVA), card, table, select (`CustomSelect` + search + add-new), pagination, date-picker (ปฏิทินไทย), chart (wrapper Recharts) |
| Error handling | ⚠️ | `alert()` ปนกับ toast system; ไม่มี error boundary; loading state บางที่ skeleton บางที่ spinner |

---

## 2.15 Role Access Matrix

| หน้าจอ | Owner | Staff | Anonymous |
|---|:--:|:--:|:--:|
| PinPad | — | — | ✅ |
| Table Map / ผังโต๊ะ | ✅ | ✅ | ✗ |
| POS Order (+ QR, void) | ✅ | ✅ | ✗ |
| Checkout (+ PromptPay, ใบเสร็จ) | ✅ | ✅ | ✗ |
| Kitchen Display (+ void) | ✅ | ✅ | ✗ |
| **Sales History** | ✅ | **✅ 🔴** | ✗ |
| Menu Manager | ✅ | ✗ | ✗ |
| Purchase Orders | ✅ | ✗ | ✗ |
| Promo Manager | ✅ | ✗ | ✗ |
| Owner Dashboard | ✅ | ✗ | ✗ |
| Loyalty CRM | ✅ | ✗ | ✗ |
| Employee Manager | ✅ | ✗ | ✗ |
| Customer QR Portal | — | — | ✅ (ป้องกันด้วย session UUID เท่านั้น) |

🔴 = ขัดกับ `ROADMAP.md:182`

> **สำคัญ:** การกั้นสิทธิ์ทั้งหมดเป็น `employee?.role === 'owner'` **ฝั่ง client เท่านั้น** — ไม่มี protected route (เพราะไม่มี route) และไม่มี server-side authorization ความปลอดภัยขึ้นกับ RLS ล้วนๆ ซึ่ง**ปัจจุบันเปิดหมดทุกตาราง**

---
---

# 3. ประเมินความพร้อมสู่ SaaS (Readiness Scorecard)

คะแนน 0–5 (0 = ไม่มีเลย, 5 = พร้อมระดับ enterprise)

| มิติ | คะแนน | เหตุผล (อ้างอิงโค้ดจริง) |
|---|:--:|---|
| **Product Depth** (ความลึกของฟีเจอร์) | **4.5** | 14 โมดูล ครอบคลุมตั้งแต่รับออเดอร์ → ครัว → เช็คบิล → CRM → รายงาน · promotion engine 3 ประเภท + time window · PromptPay EMVCo เขียนเอง · KDS realtime + เสียง · QR self-order ที่เรียกเช็คบิลได้ — **ลึกกว่า POS ระดับ SME หลายเจ้าในตลาด** |
| **UX / UI** | **4** | Responsive จริงทั้ง 3 breakpoint · dark mode · typography scale · Thai-first · ⚠️ `alert()` ปนอยู่, ไม่มี error boundary |
| **Multi-Tenancy** | **0** | `grep tenant_id\|org_id\|branch_id\|store_id` ทั่ว 25 migrations = **0 hits** · `tables` seed id 1–4 hardcode · `tables.id` = เลขโต๊ะจริง · PromptPay ID เป็น env เดี่ยว |
| **Security** | **0.5** | RLS เปิดครบ 15 ตาราง **แต่ทุก policy เป็น `USING (true)`** → anon key ที่อยู่ใน bundle หน้าลูกค้า = full DB credential · ราคาและยอดเงินเชื่อจาก client · `add_employee`/`update_employee` ไม่เช็คสิทธิ์ (ได้ 0.5 เพราะมี security headers + `delete_employee` เช็คสิทธิ์จริง) |
| **Auth & Identity** | **1** | PIN 6 หลัก + lockout + auto-lock ใช้งานได้ดีในทางปฏิบัติ **แต่** hash เป็น SHA-256 ไม่ salt บน keyspace 10⁶ และ `pin_hash` อ่านได้จาก anon · ไม่ใช้ Supabase Auth · session ใน `localStorage` แก้ได้ |
| **Billing / Subscription** | **0** | ไม่มีอะไรเลย — ไม่มีตาราง plan/subscription/usage, ไม่มี payment gateway สำหรับเก็บค่าบริการ |
| **Data Integrity** | **1.5** | RPC ใช้ `FOR UPDATE` ป้องกัน race บนสต็อกได้ดี **แต่** ไม่มี idempotency ตอน checkout · non-atomic 3 จุด (ส่งออเดอร์ / แก้ PO / ปรับแต้ม) · ไม่มี `UNIQUE(payments.order_id)` · ไม่มี trigger · timezone ไม่สอดคล้อง |
| **Reliability** | **0.5** | ไม่มี offline mode (เน็ตหลุด = ขายไม่ได้) · ไม่มี backup/DR plan · ไม่มี staging · migration มี bug ลำดับไฟล์ทำให้ `db reset` พัง |
| **Observability** | **0** | ไม่มี error tracking, structured logging, uptime monitor, APM หรือ alerting — error ส่วนใหญ่จบที่ `console.error` |
| **Scalability** | **1** | **index 2 ตัวทั้งสคีมา** ไม่มีบน FK หรือ hot path เลย · aggregation ทั้งหมดทำใน browser · ไม่มี server-side pagination · realtime broadcast ทุก event ให้ทุก subscriber รวมลูกค้า |
| **Compliance** | **0** | ไม่มี PDPA consent/export/delete (เบอร์โทรเป็น PK ลบยาก) · ไม่มี VAT/e-Tax · audit log แก้ไขได้ |
| **DevOps / Testing** | **0** | **0 test, ไม่มี CI/CD, ไม่มี deploy config** · type เขียนมือไม่ได้ gen · `test-rpc.mjs` ยิง production ได้ |
| **Integrations** | **0.5** | มี PromptPay QR (แต่ต้อง verify สลิปด้วยตา ไม่มี webhook) · ไม่มี printer/accounting/delivery/LINE API |
| **i18n / Localization** | **0.5** | ไทยล้วน hardcode ทั้งระบบ · สกุลเงิน THB fix · มี `Noto Sans Thai` แต่ไม่มี i18n framework |

## สรุปคะแนน

```
Product Depth   ████████▉  4.5 / 5   ← จุดแข็ง
UX / UI         ████████   4.0 / 5
Data Integrity  ███        1.5 / 5
Auth            ██         1.0 / 5
Scalability     ██         1.0 / 5
Security        █          0.5 / 5   ← ต้องแก้ก่อนทุกอย่าง
Reliability     █          0.5 / 5
Integrations    █          0.5 / 5
i18n            █          0.5 / 5
Multi-Tenancy   ▏          0.0 / 5   ← หัวใจของ SaaS
Billing         ▏          0.0 / 5
Observability   ▏          0.0 / 5
Compliance      ▏          0.0 / 5
DevOps/Testing  ▏          0.0 / 5
```

**เฉลี่ยรวม ≈ 1.0 / 5**

### สารหลักที่ต้องเข้าใจ

> **โปรเจกต์นี้มี "หัว" ที่ดีมาก แต่ยังไม่มี "ขา"**
>
> ฟีเจอร์ที่มองเห็นและใช้งานได้ (product depth + UX) อยู่ในระดับที่แข่งขันได้จริงในตลาดไทย — ลึกกว่า POS หลายเจ้าที่ขายอยู่ตอนนี้ด้วยซ้ำ
>
> แต่ฐานรากที่ทำให้ "ขายให้ร้านอื่นได้" (multi-tenancy, security, auth, billing, reliability) **ยังแทบไม่มีเลย** และ 1 ในนั้น — security — อยู่ในระดับที่ **ถ้าเปิดขายวันนี้จะเป็นความรับผิดทางกฎหมาย** ไม่ใช่แค่ technical debt
>
> ข่าวดี: งานที่เหลือเป็น **งานฐานราก** ซึ่งมีแบบแผนชัดเจน ไม่ใช่งานที่ต้องคิดค้นใหม่ และฟีเจอร์ที่ทำไว้แล้วจะกลายเป็นข้อได้เปรียบทันทีเมื่อฐานรากพร้อม

---
---

# 4. Gap Analysis: สิ่งที่ต้องเพิ่มเพื่อเป็น Enterprise SaaS

รูปแบบ: **ตอนนี้เป็นยังไง → ต้องเป็นยังไง → แตะไฟล์ไหน → ความยาก**
ความยาก: `S` = 1-3 วัน · `M` = 1-2 สัปดาห์ · `L` = 3-6 สัปดาห์ · `XL` = 2 เดือนขึ้นไป

---

## 🔴 A. Security Hardening — ต้องทำก่อนอย่างอื่นทั้งหมด

### A1. anon key = full DB credential `XL` 🔴 Critical

| | |
|---|---|
| **ตอนนี้** | RLS เปิดครบ 15 ตาราง แต่ policy แทบทุกตัวเป็น `FOR ALL USING (true) WITH CHECK (true)` และไม่มี policy ไหนอ้าง `auth.uid()`/`auth.jwt()` เลย · anon key เป็น `NEXT_PUBLIC_*` จึงอยู่ใน JS bundle ที่**ลูกค้าทุกคนที่สแกน QR โหลด** |
| **ผลจริง** | เปิด devtools บนหน้าลูกค้า → อ่านตาราง `employees` (รวม `pin_hash`), อ่าน `payments` ทั้งหมด, อ่านชื่อ+เบอร์ลูกค้าทุกคน, แก้ราคาเมนู, **ลบบันทึกการชำระเงิน**, สร้างบัญชี owner |
| **ต้องเป็น** | ย้าย write ทั้งหมดไปหลัง server tier ที่ใช้ service-role key → เปลี่ยน policy ของ `anon` เป็น `USING (false)` เกือบทั้งหมด เหลือ read เฉพาะ `menu_items`/`promotions` ที่หน้าลูกค้าต้องใช้ (และต้อง scope ด้วย session) |
| **ไฟล์** | `supabase/migrations/*` ทุกไฟล์ที่มี `CREATE POLICY` · `lib/supabase.ts` |

### A2. PIN hash ถอดได้ในไม่กี่วินาที `M` 🔴 Critical

| | |
|---|---|
| **ตอนนี้** | `employees` มี policy `SELECT USING (true)` และ RLS เป็น row-level ไม่ใช่ column-level → `select('pin_hash')` จาก anon คืนทุก hash · hash เป็น **SHA-256 ไม่ salt** ของตัวเลข 6 หลัก (10⁶ ค่า ≈ rainbow table 48 MB) |
| **แย่กว่านั้น** | `AuthContext` และ `EmployeeManager` ทั้งคู่ query `.eq('pin_hash', hash)` จาก browser = **PIN oracle** ทดสอบทีละค่าได้แม้ปิด SELECT แล้วก็ตาม |
| **ต้องเป็น** | ใช้ `pgcrypto` (`crypt()` + `gen_salt('bf')`) และ verify ใน `login(pin)` แบบ `SECURITY DEFINER` เพื่อให้ **hash ไม่เคยออกจากฐานข้อมูล** · ปิด anon `SELECT` บน `employees` · เพิ่มตัวนับความพยายามฝั่ง server |
| **ไฟล์** | migration ใหม่ · `context/AuthContext.tsx` · `components/EmployeeManager.tsx` |

### A3. Privilege escalation ผ่าน `add_employee` / `update_employee` `S` 🔴 Critical

| | |
|---|---|
| **ตอนนี้** | ทั้งสองเป็น `SECURITY DEFINER` **ที่ไม่มี authorization check เลย** — comment ในไฟล์เขียนว่า "สำหรับ Owner เท่านั้น" แต่ไม่มีโค้ดบังคับ · ใครก็เรียก `add_employee('x', '<sha256 ของ PIN ที่เลือกเอง>', 'owner')` ได้ |
| **ต้องเป็น** | เพิ่มพารามิเตอร์ `p_requester_pin_hash` แล้วเช็ค `role='owner'` เหมือนที่ `delete_employee` ทำอยู่แล้ว (หรือดีกว่านั้นคือย้ายไปหลัง server tier + Supabase Auth) |
| **ไฟล์** | `supabase/migrations/20260728_employee_management.sql` |

### A4. ลูกค้ากำหนดราคาเองได้ `S` 🔴 Critical

| | |
|---|---|
| **ตอนนี้** | `customer_place_order_item(p_session_id, p_menu_item_id, p_quantity, **p_unit_price**, p_notes)` — ฟังก์ชัน**ไม่เคยอ่าน `menu_items.price` มาตรวจ** · ลูกค้าที่มี session UUID สั่งราคาเท่าไหร่ก็ได้ รวมถึง `0` หรือติดลบ |
| **ต้องเป็น** | ลบพารามิเตอร์ `p_unit_price` ทิ้ง แล้วให้ฟังก์ชัน `SELECT price, is_happy_hour, happy_hour_price FROM menu_items` เอง (เท่ากับแก้ปัญหา Happy Hour ไปในตัว) |
| **ไฟล์** | `supabase/migrations/20260813_fix_place_order_table_status.sql` (นิยามล่าสุด) + migration ใหม่ |

### A5. ยอดขายคือสิ่งที่เบราว์เซอร์บอก `M` 🔴 Critical

| | |
|---|---|
| **ตอนนี้** | `complete_checkout` รับ `p_subtotal`, `p_discount_amount`, `p_net_amount`, `p_points_earned`, `p_points_redeemed`, `p_cash_amount`, `p_promptpay_amount` **จาก client ทั้งหมด** และไม่เคยตรวจสิทธิ์โปรโมชั่น ไม่เช็ค `min_order_amount`/วันที่/`is_active` |
| **ผลจริง** | client ที่ถูกดัดแปลงส่ง `p_net_amount: 0` ได้ · แต้มสมาชิกติดลบได้ (ไม่มี `CHECK points >= 0` และไม่ตรวจว่า redeem ≤ แต้มที่มี) |
| **ต้องเป็น** | คำนวณทุกอย่างจาก `order_items` + `promotions` **ใน DB หรือ server tier** แล้วให้ client ส่งแค่ "จ่ายเงินสดมาเท่าไหร่" + รหัสคูปองที่ใช้ |
| **ไฟล์** | `20260808_fix_phone_number_in_checkout.sql` + migration ใหม่ · `components/checkout/CheckoutScreen.tsx` |

### A6. Checkout ไม่มี idempotency `S` 🔴 High

| | |
|---|---|
| **ตอนนี้** | ไม่มี `FOR UPDATE` บน order · ไม่มี `UNIQUE(payments.order_id)` · guard เช็คแค่ `v_table_id IS NULL` ไม่ได้เช็ค `orders.status` → **บิลที่ปิดแล้วปิดซ้ำได้** |
| **ผลจริง** | ดับเบิลคลิก / เน็ตช้าแล้ว retry = `payments` 2 แถว + แต้มสมาชิกเบิ้ล |
| **ต้องเป็น** | `SELECT ... FOR UPDATE` บน order + `UNIQUE(payments.order_id)` + idempotency key จาก client |

### A7. ปัญหาความปลอดภัยอื่นๆ

| # | ปัญหา | ระดับ | ยาก |
|---|---|:--:|:--:|
| A7.1 | Seed PIN อยู่ใน git: owner = `SHA-256("")`, staff = `SHA-256("123456")` · README ประกาศ PIN ทดสอบ `111111`/`222222` | 🔴 High | `S` |
| A7.2 | ไม่มี `DROP FUNCTION` เลย → RPC overload เก่ายังเรียกได้ เช่น `complete_checkout` เวอร์ชัน 8 args ที่**ไม่เขียน `phone_number`/`cash_amount`** (คือบั๊กที่ migration `20260808` เขียนมาแก้พอดี) | 🟠 Medium | `S` |
| A7.3 | หน้าลูกค้า `handleRequestCheckBill` **เขียน `tables` ตรงๆ จาก anon client** ไม่ผ่าน RPC — ใครมี URL พลิกสถานะโต๊ะได้ | 🟠 Medium | `S` |
| A7.4 | `place_order_item` ล็อก `FOR UPDATE` บน `menu_items` **ไม่ใช่บน `orders`** และไม่มี partial unique index บน active order → 2 คำสั่งพร้อมกันคนละเมนู **เปิดบิลซ้ำต่อโต๊ะได้** | 🟠 Medium | `S` |
| A7.5 | `void_order_item` ตัดสินคืนสต็อกด้วยการ **match ข้อความไทย** (`'คีย์ผิด'`, `'คีย์ผิดพลาด'`, `'คีย์ออเดอร์ผิดพลาด'`) — พิมพ์ผิดหรือเปลี่ยน label ใน UI = พฤติกรรมสต็อกเปลี่ยนเงียบๆ | 🟠 Medium | `S` |
| A7.6 | `employee_name` ใน `void_logs` และ `buyer_name` ใน PO เป็น **string จาก client ที่ปลอมได้** — audit trail ปลอมได้ | 🟠 Medium | `M` |
| A7.7 | `orders.table_id` FK เป็น `ON DELETE CASCADE` → **ลบโต๊ะ = ลบประวัติการเงินทั้งหมดของโต๊ะนั้น** | 🟠 Medium | `S` |
| A7.8 | `NEXT_PUBLIC_PROMPTPAY_ID` ไม่ตั้ง → fallback `'0899999999'` เงียบๆ · Supabase URL/key ไม่ตั้ง → fallback `'placeholder...'` แล้ว build ผ่าน boot ได้ | 🟠 Medium | `S` |
| A7.9 | Realtime broadcast **ไม่มี filter** → ลูกค้าที่เปิดหน้า QR รับ event ของทุกโต๊ะ ทุกออเดอร์ ทุกการเปลี่ยนราคาในร้าน | 🟡 Low | `M` |
| A7.10 | `test-rpc.mjs` ที่ root สร้าง client แล้วยิง `place_order_item` ใส่ `NEXT_PUBLIC_SUPABASE_URL` — รวมถึง production | 🟡 Low | `S` |

---

## 🏢 B. Multi-Tenancy — หัวใจของ SaaS `XL`

> นี่คืองานใหญ่ที่สุดในเอกสารนี้ และเป็น **schema rewrite ไม่ใช่ migration ธรรมดา**

| | |
|---|---|
| **ตอนนี้** | ไม่มี tenant column ใดๆ ใน 15 ตาราง · `tables` seed id 1–4 hardcode และ **`tables.id` ทำหน้าที่เป็นเลขโต๊ะจริง** · PromptPay ID เป็น env เดี่ยว · ชื่อร้าน `YOKAYAKI` hardcode ใน EMVCo payload · RLS ทุกตัวเป็น `USING(true)` ซึ่งจะกลายเป็นช่องโหว่ข้ามร้านทันทีที่มีร้านที่ 2 |

### สิ่งที่ต้องทำ

| งาน | รายละเอียด | ยาก |
|---|---|:--:|
| ตารางใหม่ | `organizations` (ร้าน/แบรนด์) · `branches` (สาขา) · `memberships` (user ↔ org + role) · `org_settings` (PromptPay ID, ชื่อร้านบนใบเสร็จ, timezone, VAT rate, สกุลเงิน) | `M` |
| เติม tenant key | เพิ่ม `branch_id` (หรือ `org_id`) ลง **ทั้ง 15 ตาราง** + backfill ข้อมูลเดิม + `NOT NULL` + FK + composite index | `L` |
| แก้ `tables` | เปลี่ยน PK เป็น surrogate `id UUID` + เพิ่ม `table_number INT` + `branch_id` + `UNIQUE(branch_id, table_number)` · แก้ทุกที่ที่ใช้ `tables.id` เป็นเลขโต๊ะ (`TableCard`, `KitchenScreen`, `ReceiptPrintView`, ทุก RPC) | `L` |
| เขียน RLS ใหม่ | เปลี่ยนทุก policy จาก `USING (true)` → `USING (branch_id IN (SELECT branch_id FROM memberships WHERE user_id = auth.uid()))` · หน้าลูกค้าใช้ policy แยกที่ scope ด้วย `qr_session` | `L` |
| แก้ RPC ทั้ง 7 ตัว | ให้รับ/ตรวจ tenant scope และปฏิเสธ cross-tenant access | `M` |
| ย้าย config เข้า DB | PromptPay ID, ชื่อร้าน, timezone, VAT, สกุลเงิน, โลโก้ใบเสร็จ ออกจาก env/hardcode | `M` |
| Realtime scoping | filter channel ตาม `branch_id` เพื่อไม่ให้ event ข้ามร้าน | `M` |

---

## 🔑 C. Auth & Authorization `L`

| | ตอนนี้ | ต้องเป็น |
|---|---|---|
| Identity | PIN 6 หลักเป็น identity ชั้นเดียว · `localStorage` เป็น session | **Supabase Auth** สำหรับล็อกอินระดับองค์กร (email/password หรือ SSO) + JWT ที่มี `org_id`/`role` claim · **PIN เป็นชั้นใน (device unlock / shift login)** ไม่ใช่ identity ทั้งหมด |
| Password hash | SHA-256 ไม่ salt | `pgcrypto` bcrypt verify ใน DB |
| Role | owner / staff (2 ระดับ, เช็คฝั่ง client) | **owner / manager / cashier / kitchen / accountant** + permission matrix บังคับที่ DB (RLS) และ server tier |
| Session | `localStorage` แก้ได้ | JWT httpOnly cookie + refresh token + revoke ได้ |
| Audit | `employee_name` เป็น string จาก client | ผูกกับ `auth.uid()` ที่ปลอมไม่ได้ |
| ที่เหลือ | — | เพิ่ม: กู้คืน PIN, บังคับเปลี่ยน PIN เริ่มต้น, ห้ามลดสิทธิ์/ลบ owner คนสุดท้าย, บันทึกประวัติล็อกอิน |

---

## 🛡️ D. Server Tier & Trust Boundary `L`

| | |
|---|---|
| **ตอนนี้** | ไม่มีชั้น server เลย — ทุก mutation รวมถึง checkout และการจัดการพนักงาน มาจาก browser ที่ถือ key ซึ่ง RLS ให้สิทธิ์เต็ม |
| **ต้องเป็น** | เพิ่ม Next.js **Route Handlers / Server Actions** + service-role client (server-only env var, **ไม่ใช่** `NEXT_PUBLIC_`) เป็น trust boundary จริง |

**สิ่งที่ต้องย้ายเข้า server tier:**

| งาน | เหตุผล |
|---|---|
| คำนวณราคาและยอดเงินทั้งหมด | เลิกรับ `p_unit_price`, `p_subtotal`, `p_net_amount` จาก client (แก้ A4 + A5) |
| ส่งออเดอร์เป็น transaction เดียว | แทน loop RPC ทีละรายการที่ไม่ atomic |
| Idempotency key ตอน checkout | กันจ่ายซ้ำ |
| Input validation (zod) | ตรวจ payload ก่อนถึง DB |
| Rate limiting | ป้องกัน brute-force ฝั่ง server จริง (ตอนนี้เป็น `localStorage` ล้วน) |
| Audit log ที่ปลอมไม่ได้ | ใช้ identity จาก JWT ไม่ใช่ string จาก client |
| Webhook receiver | รับ payment gateway callback |

---

## 💰 E. Billing & Subscription — ตัว SaaS จริงๆ `L`

| งาน | รายละเอียด |
|---|---|
| ตารางใหม่ | `plans` (Free/Starter/Pro/Enterprise + limit) · `subscriptions` (org ↔ plan + สถานะ + รอบบิล) · `usage_records` (จำนวนบิล/สาขา/ผู้ใช้ต่อเดือน) · `invoices` |
| Payment gateway | **Omise** หรือ **2C2P** (ไทย, รองรับ PromptPay/บัตร) หรือ **Stripe** (ถ้าขายต่างประเทศด้วย) — เก็บค่าบริการรายเดือน |
| Trial & onboarding | สมัครเอง → สร้าง org + สาขาแรก + seed เมนูตัวอย่าง → ทดลอง 14–30 วัน |
| Feature gating | middleware/hook ตรวจ plan ก่อนเปิดโมดูล (เช่น multi-branch = Pro+, API = Enterprise) |
| Dunning | เตือนก่อนหมดอายุ, retry การเก็บเงิน, ระงับ/ปลดระงับบัญชี |
| Invoice | ออกใบแจ้งหนี้/ใบกำกับภาษีค่าบริการให้ร้านลูกค้า |

---

## 🔄 F. Reliability & Operations `L`

| งาน | ตอนนี้ | ต้องเป็น | ยาก |
|---|---|---|:--:|
| **Offline mode** | เน็ตหลุด = ขายไม่ได้เลย (ทุก action ยิงตรงไป Supabase) | **สำคัญมากสำหรับร้านอาหาร** — local queue (IndexedDB) + sync เมื่อกลับมาออนไลน์ + conflict resolution + แสดงสถานะการเชื่อมต่อ | `L` |
| Backup / DR | ไม่มีแผน | เปิด PITR · กำหนด RTO/RPO · ทดสอบ restore เป็นระยะ | `M` |
| Environment | มี production เดียว | dev / staging / production แยก + seed data สำหรับ staging | `M` |
| Migration hygiene | 🔴 `20260720_payment_promotions.sql` เรียงก่อน `20260720_promotions.sql` (`pa` < `pr`) → **`supabase db reset` บน DB เปล่าจะพัง** · หลาย migration ไม่ idempotent (`CREATE TABLE` ไม่มี `IF NOT EXISTS`, `CREATE POLICY` ไม่มี guard) · `20260730_enable_realtime.sql` ใช้ `EXCEPTION WHEN OTHERS THEN NULL` **กลืน error ทั้งหมด** → realtime อาจไม่ถูกตั้งค่าโดยไม่มีสัญญาณเตือน | เปลี่ยนชื่อไฟล์ให้เรียงถูก · ทำทุก migration idempotent · เอา blanket exception ออก · `DROP FUNCTION` overload เก่า · ตั้ง `REPLICA IDENTITY FULL` เพื่อให้ realtime DELETE/UPDATE ส่งค่าเดิมมาด้วย | `M` |
| Deploy | ไม่มี config | Vercel/Docker + health check + rollback plan | `S` |

---

## 📡 G. Observability `M`

| งาน | รายละเอียด |
|---|---|
| Error tracking | Sentry (frontend + server tier) — ตอนนี้ error ส่วนใหญ่จบที่ `console.error` |
| Structured logging | log ทุก mutation สำคัญพร้อม tenant/user/request id |
| Uptime & APM | ping endpoint + p95 latency ของ RPC ที่สำคัญ |
| Business alerting | แจ้งเตือนเมื่อ void ผิดปกติ · ยอดขายเป็น 0 ในเวลาเปิดร้าน · checkout ล้มเหลวถี่ · สต็อกติดลบ |
| Dashboard สำหรับผู้ให้บริการ | จำนวน org ที่ active, usage ต่อ plan, error rate ต่อ tenant |

---

## ⚡ H. Scalability & Data `M`

### H1. Index ที่ขาด (สำคัญที่สุดในหมวดนี้)

ปัจจุบันมี index แค่ 2 ตัวทั้งสคีมา (`item_ingredients.purchase_order_id`, `purchase_orders.purchase_date`) ที่เหลือพึ่ง PK index ล้วน — ทุก hot path เป็น sequential scan

```sql
-- ยิงทุกครั้งที่สั่งอาหาร (ทั้ง 2 RPC)
CREATE INDEX idx_orders_table_status   ON orders(table_id, status);
-- ยิงทุกครั้งที่ render ครัว / checkout / void
CREATE INDEX idx_order_items_order_id  ON order_items(order_id);
-- ยิงทุกครั้งที่เปิด dashboard / sales history
CREATE INDEX idx_payments_created_at   ON payments(created_at);
CREATE INDEX idx_payments_phone        ON payments(phone_number);
-- full scan ทุกครั้งที่ล็อกอิน
CREATE INDEX idx_employees_pin_hash    ON employees(pin_hash);
-- ยิงทุกครั้งที่เช็คบิล
CREATE INDEX idx_qr_sessions_table     ON qr_sessions(table_id, status);
-- อื่นๆ
CREATE INDEX idx_void_logs_created_at  ON void_logs(created_at);
CREATE INDEX idx_points_logs_phone     ON points_logs(phone_number);
CREATE INDEX idx_payment_promos_pay    ON payment_promotions(payment_id);
-- กันเปิดบิลซ้ำต่อโต๊ะ (แก้ A7.4)
CREATE UNIQUE INDEX uniq_active_order_per_table ON orders(table_id) WHERE status = 'active';
-- กันจ่ายซ้ำ (แก้ A6)
ALTER TABLE payments ADD CONSTRAINT uniq_payment_per_order UNIQUE (order_id);
```

### H2. ย้าย aggregation ออกจาก browser

| | |
|---|---|
| **ตอนนี้** | Dashboard 6 คอมโพเนนต์ยิง query แยกกัน ~9 round-trip ต่อการเปลี่ยนวันที่ และหลายตัวดึง `payments` ซ้ำ · SalesHistory join ด้วยมือ 4 ขั้น · LoyaltyManager/MenuManager/PO ดึงทั้งตารางมา paginate ใน JS |
| **ต้องเป็น** | SQL view / materialized view / aggregate RPC สำหรับรายงาน · server-side pagination + filter ทุกหน้า · cache ชั้นบน (React Query / server cache) |

### H3. อื่นๆ

- **Partitioning & archival** — `orders`, `order_items`, `payments` โตไม่จำกัด; ต้องมี partition ตามเดือนและนโยบายเก็บย้อนหลัง
- **Realtime scoping** — filter per tenant/branch (ดู A7.9)
- **Timezone** — ใช้ store timezone จาก `org_settings` ทุกที่ แทนการปน UTC ISO กับ local date (แก้บั๊กใน Dashboard)
- **Connection pooling** — ตอนนี้ browser ต่อ PostgREST ตรง, concurrency ผูกกับ pool ของ Supabase project; แต่ละเครื่อง POS ถือ realtime socket ของตัวเองที่ subscribe 5 ตารางแบบไม่ filter

---

## ⚖️ I. Compliance & Legal `M`

| หมวด | ตอนนี้ | ต้องมี |
|---|---|---|
| **PDPA (ไทย) / GDPR** | เก็บชื่อ+เบอร์ลูกค้าโดยไม่มี consent · **เบอร์โทรเป็น PK ของ `loyalty_members` และถูก FK อ้างจาก `points_logs`** → ลบ/anonymize ยากมาก | consent flow · data export · right-to-delete (ต้อง**เปลี่ยน PK เป็น surrogate id** ก่อน) · privacy policy · DPA กับร้านลูกค้า |
| **ภาษี (ไทย)** | ไม่มี VAT, ไม่มีเลขผู้เสียภาษีบนใบเสร็จ, ไม่มีใบกำกับภาษี | VAT 7% (แยก/รวม) · service charge · **ใบกำกับภาษีเต็มรูป** · เชื่อม e-Tax Invoice ของกรมสรรพากร · ใบเสร็จรับเงิน/ใบกำกับอย่างย่อ |
| **Audit** | `void_logs`/`points_logs`/`stock_logs` เขียนได้จาก anon และชื่อผู้ทำปลอมได้ · ไม่มี trigger บังคับ log → `UPDATE menu_items SET stock=...` ตรงๆ ข้าม `stock_logs` ได้ | append-only audit log ที่แก้ไม่ได้ · ผูกกับ identity จริง · trigger บังคับ |
| **Data retention** | ไม่มีนโยบาย | กำหนดอายุข้อมูล + auto-purge |
| **PCI-DSS** | ยังไม่รับบัตร (PromptPay + เงินสด) — ยังไม่อยู่ใน scope | ถ้ารับบัตรเมื่อไหร่ ต้องประเมิน scope ทันที |

---

## 🏗️ J. ฟีเจอร์ระดับ Enterprise ที่ยังไม่มี `XL` (รวม)

| ฟีเจอร์ | ทำไมสำคัญ | ยาก |
|---|---|:--:|
| **Multi-branch consolidated dashboard** | ลูกค้าที่มีหลายสาขาคือลูกค้าที่จ่ายแพงที่สุด | `L` |
| **Recipe / BOM** — เชื่อม `item_ingredients` ↔ `menu_items` | **คิด COGS รายจานไม่ได้เลยตอนนี้** — "กำไร" ในแดชบอร์ดเป็นตัวเลขที่เข้าใจผิดได้ | `L` |
| **ESC/POS printer + KOT แยกสถานี** | ตอนนี้พึ่ง `window.print()` อย่างเดียว — ร้านจริงต้องพิมพ์ใบครัวแยกเตา/แยกบาร์อัตโนมัติ | `L` |
| **Payment gateway webhook** | PromptPay ตอนนี้ต้อง **verify สลิปด้วยตา** — ต้องมี auto-reconcile | `M` |
| **Split bill by seat / แยกบิล** | ร้านอิซากายะกลุ่มใหญ่ต้องใช้บ่อยมาก | `M` |
| Shift / time clock / payroll export | ควบคุมแรงงาน + เชื่อมบัญชี | `M` |
| PO approval workflow + supplier management | ร้านหลายสาขาต้องมี | `M` |
| Table reservation / waitlist | เพิ่มรายได้ต่อโต๊ะ | `M` |
| Delivery & takeaway + เชื่อม Grab/LINE MAN/Shopee Food | ช่องทางรายได้หลักของร้านไทยยุคนี้ | `L` |
| Open API / webhook | ปลดล็อกลูกค้า Enterprise ที่มีระบบเดิม | `M` |
| Accounting integration (FlowAccount, PEAK, Xero) | ลดงานบัญชีของร้าน | `M` |
| LINE OA / marketing automation | ช่องทาง CRM หลักในไทย | `M` |
| Customer app / e-loyalty card | ต่อยอดจาก CRM ที่มีแล้ว | `L` |
| Feedback & review | ปิด loop คุณภาพบริการ | `S` |
| Multi-currency / multi-language | ขยายออกนอกไทย | `L` |
| Inventory forecasting / auto-reorder | ขายเป็น add-on ได้ | `L` |

---

## 🔧 K. Engineering Foundation `M`

| งาน | ตอนนี้ | ต้องเป็น |
|---|---|---|
| **Test** | **0 test** (มีแค่ `test-rpc.mjs` สคริปต์เดี่ยว) | unit (คำนวณโปร/แต้ม/EMVCo/CRC) · integration (RPC + RLS) · E2E (Playwright: สั่ง→ครัว→เช็คบิล) — **สำคัญมากเพราะเฟส 2-4 คือ rewrite ขนาดใหญ่** |
| **CI/CD** | ไม่มี `.github/` | lint + typecheck + test + migration check ทุก PR |
| DB types | เขียนมือ | `supabase gen types typescript` |
| Error handling | `alert()` ปนกับ toast, ไม่มี error boundary | toast system เดียว + error boundary ต่อ route |
| โครงสร้างโค้ด | 13 re-export shim ปนกับ path จริง · `customer/[session_id]/page.tsx` 1,235 บรรทัด · `SidebarNav` markup ซ้ำ 3 ชุด | ลบ shim · แตกหน้าลูกค้า · dedupe nav |
| Dependencies | `@base-ui/react` + `shadcn` ติดตั้งแต่ไม่ใช้ | ถอดออกหรือใช้จริง |
| Loading state | บางที่ skeleton บางที่ spinner | มาตรฐานเดียว |

---

## 🐛 L. Bug / Debt ที่ควรเก็บก่อนขยาย `S` (แต่ต้องทำ)

| # | ปัญหา | ไฟล์ |
|---|---|---|
| L1 | แต้ม `/25` ในโค้ด vs `/10` ในเอกสาร — ต้องตัดสินใจว่าอันไหนถูก | `CheckoutScreen.tsx` |
| L2 | Happy Hour ครึ่งใบ — `happy_hour_price` เป็น dead column แต่ ROADMAP บอกว่าใช้งานอยู่ | `MenuItemModal.tsx`, RPC |
| L3 | PromoManager ไม่มีช่อง `image_url` / `start_date` / `end_date` ทั้งที่ DB + checkout + หน้าลูกค้าใช้จริง | `PromoManager.tsx` |
| L4 | MenuItemModal แก้ `stock` / `is_stock_tracked` / `is_happy_hour` ไม่ได้ | `MenuItemModal.tsx` |
| L5 | staff เห็น SalesHistory ผิดจากสเปก | `SidebarNav.tsx`, `TableMap.tsx` |
| L6 | แก้ PO = ลบแล้ว insert ใหม่ ไม่ atomic → ข้อมูลหายได้ | `IngredientPurchaseManager.tsx` |
| L7 | ปรับแต้มไม่ atomic + ไม่มี lock | `LoyaltyManager.tsx` |
| L8 | ส่งออเดอร์เป็น loop ไม่ atomic + ไม่ล้างตะกร้าเมื่อ error | `POSOrderScreen.tsx`, `customer/[session_id]/page.tsx` |
| L9 | Cart ฝั่ง staff merge ด้วย `id` ไม่ดูโน้ต (ฝั่งลูกค้าทำถูก) | `POSOrderScreen.tsx` |
| L10 | ปุ่มปิดเสียงในครัวทำให้ realtime channel re-subscribe + เสียงเล่นซ้ำจาก 2 ทาง | `KitchenScreen.tsx` |
| L11 | `useDateFilter` มี preset 3/6 เดือนที่ UI ไม่ render | `DateFilterBar.tsx` |
| L12 | `BusinessKPIs.totalMembers` ไม่สนใจช่วงวันที่ | `BusinessKPIs.tsx` |
| L13 | Timezone UTC vs local ในตัวกรอง Dashboard | `TopKPICards.tsx`, `BusinessSpotlight.tsx` |
| L14 | LAN IP hardcode ใน `next.config.ts` | `next.config.ts` |
| L15 | Void reason list ไม่ตรงกันระหว่าง POS (5) กับครัว (4) | `VoidItemModal.tsx`, `KitchenOrderCard.tsx` |
| L16 | `price_per_unit` ไม่เคยถูกบันทึกลง DB | `IngredientPurchaseManager.tsx` |
| L17 | `discount_applied` ใน `order_items` เป็น dead column ไม่มีอะไรเขียน | migration |
| L18 | `tables.updated_at` ตั้งครั้งเดียวตอน insert ไม่เคยอัปเดต (ไม่มี trigger) | migration |

---
---

# 5. Roadmap สู่ SaaS

| Phase | ชื่อ | ทำอะไร | ทำไมต้องลำดับนี้ | ประมาณการ |
|:--:|---|---|---|:--:|
| **0** | 🔴 **Security Hardening** | ปิดช่องโหว่ A1–A7 ทั้งหมด: RLS, PIN hash, RPC authorization, ราคา/ยอดเงิน server-side, idempotency, ลบ seed PIN, drop overload | **ถ้าไม่ทำ ขายไม่ได้เลย** — ข้อมูลลูกค้าและเงินรั่ว เป็นความรับผิดทางกฎหมาย ไม่ใช่แค่ technical debt | 3–4 สัปดาห์ |
| **1** | 🛡️ **Server Tier** | Route Handlers + service-role + zod validation + rate limit + transaction เดียวต่อออเดอร์ | เป็นฐานที่ทุกเฟสหลังจากนี้ต้องพึ่ง — ไม่มีชั้นนี้ multi-tenancy กับ billing ทำไม่ได้ | 3–4 สัปดาห์ |
| **2** | 🔧 **Data Integrity & Bug Sweep** | แก้ L1–L18, ใส่ index ทั้งหมด (H1), แก้ timezone, แก้ migration hygiene, ทำ atomic ทั้ง 3 จุด | ต้องนิ่งก่อนเข้า schema rewrite — และหลายข้อเป็น `S` ทำเร็ว | 2–3 สัปดาห์ |
| **3** | 🧪 **Testing Foundation** | E2E ครอบ flow หลัก (สั่ง→ครัว→เช็คบิล) + integration test ของ RPC/RLS + CI | **ต้องมีก่อน Phase 4** เพราะ multi-tenancy คือ rewrite ที่แตะทุกไฟล์ — ไม่มี test = พังเงียบ | 2–3 สัปดาห์ |
| **4** | 🏢 **Multi-Tenancy** | organizations / branches / memberships · `branch_id` ทั้ง 15 ตาราง · RLS ใหม่ · แก้ `tables.id` · ย้าย config เข้า DB | **หัวใจของ SaaS** — ไม่มีอันนี้ก็ไม่ใช่ SaaS | 6–10 สัปดาห์ |
| **5** | 🔑 **Auth & RBAC** | Supabase Auth + JWT claim + bcrypt PIN + role 5 ระดับ + permission matrix | ต้องมี tenant ก่อนถึงจะออกแบบ role scope ได้ | 3–5 สัปดาห์ |
| **6** | 💰 **Billing** | plans / subscriptions / usage / gateway (Omise หรือ Stripe) / trial / feature gating / self-serve onboarding | **จุดที่เริ่มมีรายได้** | 4–6 สัปดาห์ |
| **7** | 🔄 **Reliability & Observability** | Offline queue · backup/PITR/DR · staging · Sentry · logging · alerting · deploy pipeline | ต้องมีก่อนรับลูกค้าจริงจำนวนมาก (โดยเฉพาะ offline สำหรับร้านอาหาร) | 5–7 สัปดาห์ |
| **8** | 🏗️ **Enterprise Features** | Multi-branch report · Recipe BOM · ESC/POS + KOT · payment webhook · split bill · API · integrations | ปลดล็อก tier บนและราคาที่สูงขึ้น | 3–6 เดือน |
| **9** | ⚖️ **Compliance** | PDPA (consent/export/delete + เปลี่ยน PK สมาชิก) · VAT + e-Tax Invoice · audit log ที่แก้ไม่ได้ · retention | ปลดล็อกลูกค้าองค์กร/เชนที่มีฝ่ายกฎหมาย | 2–3 เดือน |

**รวมประมาณการถึง MVP ของ SaaS (Phase 0–7):** ~7–9 เดือน สำหรับนักพัฒนา 1 คนเต็มเวลา หรือ ~4–5 เดือน สำหรับทีม 2–3 คน

> 💡 **ทางลัดที่พิจารณาได้:** ถ้าต้องการรายได้เร็ว สามารถขาย Phase 0–2 เป็น **"ติดตั้งให้ร้านเดียว (on-premise / dedicated instance)"** ได้ก่อน — แต่ละร้านได้ Supabase project ของตัวเอง ไม่ต้องทำ multi-tenancy แต่ scale ไม่ได้เกิน ~10–20 ร้านเพราะต้นทุนบำรุงรักษาต่อร้านสูง เหมาะเป็นสะพานหารายได้ระหว่างทำ Phase 4

---
---

# 6. มุมธุรกิจ (Business View)

## 6.1 Positioning

**ตลาด:** ระบบ POS ร้านอาหารในไทย — แข่งกับ **Loyverse** (ฟรี, ต่างชาติ), **FoodStory**, **Ocha**, **StoreHub**, **Wongnai POS**

**จุดต่างที่มีอยู่แล้ววันนี้ (ไม่ต้องสร้างใหม่):**

| จุดแข็ง | ทำไมสำคัญ |
|---|---|
| **QR Self-Order ที่สมบูรณ์** | ลูกค้าสั่งเอง + ดูสถานะอาหารสด + **เรียกเช็คบิลเองได้** — ลดภาระพนักงานจริง คู่แข่งหลายเจ้าคิดเงินเพิ่มสำหรับฟีเจอร์นี้ |
| **KDS realtime พร้อมเสียง + wait timer** | ครัวเห็นทันที ไม่ต้องมีคนเดินใบ; timer 8/15 นาทีช่วยควบคุมคุณภาพบริการ |
| **Promotion engine 3 ประเภท + time window** | ส่วนลด/คูปอง/ซื้อแถม + Happy Hour ตามเวลา คำนวณอัตโนมัติตอนเช็คบิล |
| **CRM + Loyalty ในตัว** | สมาชิกด้วยเบอร์โทร + ประวัติซื้อ + ปรับแต้มพร้อม audit log — ไม่ต้องซื้อระบบแยก |
| **PromptPay Dynamic QR** | ฝังยอดจริงลง QR (รวมกรณีจ่ายผสม) — ตรงกับพฤติกรรมการจ่ายเงินของคนไทย |
| **Thai-first ทั้งระบบ** | UI, ใบเสร็จ thermal, ฟอนต์, ปฏิทิน — ไม่ใช่ของแปลจากอังกฤษ |

**ช่องว่างที่คู่แข่งมีแต่เรายังไม่มี:** multi-branch · ESC/POS printer · delivery integration · accounting integration · offline mode · e-Tax invoice

---

## 6.2 Pricing Tier ที่เสนอ

| | 🆓 **Free** | 🌱 **Starter** | 🚀 **Pro** | 🏢 **Enterprise** |
|---|:--:|:--:|:--:|:--:|
| **ราคา/เดือน** | ฿0 | ฿499 | ฿1,290 | ฿3,900+ (ต่อรอง) |
| **กลุ่มเป้าหมาย** | ร้านเปิดใหม่ / คาเฟ่เล็ก | ร้านอาหาร 1 สาขา | ร้านที่โตแล้ว / 2-3 สาขา | เชน / แฟรนไชส์ |
| **สาขา** | 1 | 1 | 3 | ไม่จำกัด |
| **ผู้ใช้** | 2 | 5 | 15 | ไม่จำกัด |
| **บิล/เดือน** | 300 | ไม่จำกัด | ไม่จำกัด | ไม่จำกัด |
| | | | | |
| **📦 ฟีเจอร์ที่ "มีอยู่แล้ววันนี้"** | | | | |
| POS + ผังโต๊ะ + Void | ✅ | ✅ | ✅ | ✅ |
| Kitchen Display (KDS) | — | ✅ | ✅ | ✅ |
| **QR Self-Order** | — | ✅ | ✅ | ✅ |
| PromptPay Dynamic QR | ✅ | ✅ | ✅ | ✅ |
| ใบเสร็จ Thermal 80mm | ✅ | ✅ | ✅ | ✅ |
| จัดการเมนู + สต็อก | ✅ | ✅ | ✅ | ✅ |
| **Promotion engine** | — | ✅ | ✅ | ✅ |
| **Loyalty CRM** | — | ✅ | ✅ | ✅ |
| Sales History + Void log | จำกัด 7 วัน | 90 วัน | ไม่จำกัด | ไม่จำกัด |
| Owner Dashboard | พื้นฐาน | ✅ | ✅ | ✅ |
| Purchase Orders | — | ✅ | ✅ | ✅ |
| จัดการพนักงาน + RBAC | 2 ระดับ | 2 ระดับ | 5 ระดับ | 5 ระดับ + custom |
| | | | | |
| **🔨 ฟีเจอร์ที่ "ต้องสร้างใหม่"** | | | | |
| Offline mode *(Phase 7)* | — | ✅ | ✅ | ✅ |
| Multi-branch dashboard *(P8)* | — | — | ✅ | ✅ |
| Recipe BOM / COGS รายจาน *(P8)* | — | — | ✅ | ✅ |
| ESC/POS + KOT แยกสถานี *(P8)* | — | — | ✅ | ✅ |
| Split bill by seat *(P8)* | — | — | ✅ | ✅ |
| Payment webhook auto-reconcile *(P8)* | — | — | ✅ | ✅ |
| Delivery integration *(P8)* | — | — | add-on | ✅ |
| Accounting integration *(P8)* | — | — | add-on | ✅ |
| Open API / Webhook *(P8)* | — | — | — | ✅ |
| e-Tax Invoice + VAT *(P9)* | — | — | ✅ | ✅ |
| SSO / custom role *(P5)* | — | — | — | ✅ |
| SLA + dedicated support | — | อีเมล | แชท | โทร + SLA |

### 💡 ข้อสังเกตสำคัญ

> **ฟีเจอร์ที่มีอยู่แล้ววันนี้ครอบคลุมทั้ง Free และ Starter ได้เต็ม และครอบคลุม Pro ไปแล้วเกินครึ่ง**
>
> สิ่งที่ขาดไม่ใช่ "ของขาย" แต่คือ **ฐานรากที่ทำให้ขายได้** (multi-tenancy, security, billing) ซึ่งลูกค้าไม่เคยเห็นแต่ขาดไม่ได้
>
> นี่เป็นสถานการณ์ที่ **ดีกว่า** กรณีตรงข้าม (มีฐานรากแต่ไม่มีฟีเจอร์) เพราะฐานรากมีแบบแผนชัดเจน ประเมินเวลาได้แม่น ในขณะที่ product-market fit ต้องลองผิดลองถูก

---

## 6.3 ความเสี่ยงหลัก

| ความเสี่ยง | ระดับ | การรับมือ |
|---|:--:|---|
| **Schema rewrite ครั้งใหญ่ (Phase 4)** แตะทั้ง 15 ตารางและทุกไฟล์ | 🔴 สูง | **ต้องทำ Phase 3 (Testing) ก่อนเสมอ** — ห้ามข้าม |
| **ไม่มี test เลยตอนนี้** ทำให้ทุก refactor เสี่ยง | 🔴 สูง | Phase 3 แทรกก่อน Phase 4 ในลำดับที่วางไว้แล้ว |
| **Security debt สะสม** ถ้าเปิดขายก่อนแก้ | 🔴 สูง | Phase 0 ต้องเสร็จก่อนรับลูกค้าคนแรกเด็ดขาด |
| **Single-dev bus factor** — โปรเจกต์นี้พัฒนาโดยคนเดียว 214 commits | 🟠 กลาง | เอกสารฉบับนี้ + `docs/superpowers/` ช่วยได้บ้าง; ควรมีคนที่ 2 ก่อน Phase 4 |
| **ตลาด POS ไทยแข่งราคาสูง** — Loyverse ให้ฟรี | 🟠 กลาง | อย่าแข่งที่ราคา แข่งที่ QR self-order + KDS + CRM ครบในตัวเดียวและ Thai-first |
| **ต้นทุน Supabase ต่อ tenant** ถ้าออกแบบผิดอาจไม่คุ้ม | 🟠 กลาง | shared instance + RLS (ไม่ใช่ project ต่อร้าน) และวัด usage ตั้งแต่ Phase 6 |
| **PDPA** — เก็บ PII ลูกค้าโดยไม่มี consent อยู่แล้ววันนี้ | 🟠 กลาง | Phase 9 แต่ควรใส่ consent flow ตั้งแต่ Phase 4 ที่แตะ schema อยู่แล้ว |

---
---

# 7. ภาคผนวก (Appendix)

## 7.1 ฐานข้อมูล — 15 ตาราง

| # | ตาราง | คำอธิบาย | ต้องแก้อะไรตอนทำ Multi-Tenant |
|:--:|---|---|---|
| 1 | `employees` | พนักงาน (owner/staff) + `pin_hash` (SHA-256 ไม่ salt, **ไม่มี UNIQUE**) | + `org_id` · เปลี่ยนเป็น bcrypt · ปิด anon SELECT · เชื่อม `auth.users` |
| 2 | `tables` | โต๊ะ — **`id` = เลขโต๊ะจริง, seed 1–4 hardcode** · `updated_at` ไม่เคยอัปเดต | 🔴 **เปลี่ยน PK เป็น surrogate** + `table_number` + `branch_id` — งานหนักที่สุด |
| 3 | `qr_sessions` | เซสชัน QR ลูกค้า (UUID, หมดอายุ 2 ชม., expire แบบ lazy) | + `branch_id` · RLS scope · ต่ออายุอัตโนมัติ |
| 4 | `menu_items` | เมนู + ราคา + สต็อก + `is_stock_tracked` + `category` (free text) + `image_url` + `unit` + `is_happy_hour`/`happy_hour_price` (**dead**) | + `branch_id` · `category` → lookup table · ตัดสินใจเรื่อง happy hour |
| 5 | `orders` | ออเดอร์ (active/completed/voided) · **ไม่มี unique บน active order ต่อโต๊ะ** | + `branch_id` · partial unique index · เปลี่ยน FK `CASCADE` → `RESTRICT` |
| 6 | `order_items` | รายการย่อย + `notes` · `discount_applied` เป็น **dead column** | + `branch_id` (denorm เพื่อ RLS) · index บน `order_id` |
| 7 | `void_logs` | ประวัติ void — **denormalized เต็ม ไม่มี FK ไปไหนเลย** ตามกลับไปหาบิลไม่ได้ | + `branch_id` + FK ไป `order_items` · ผูก employee จริง |
| 8 | `loyalty_members` | สมาชิก — **`phone_number` เป็น PK** (PII เป็น natural key) · ไม่มี `CHECK points >= 0` | 🔴 **เปลี่ยน PK เป็น surrogate** (จำเป็นสำหรับ PDPA right-to-delete) · + `org_id` |
| 9 | `payments` | ธุรกรรม + `cash_amount`/`promptpay_amount` + `phone_number` (**ไม่มี FK**) · **ไม่มี UNIQUE บน `order_id`** | + `branch_id` · `UNIQUE(order_id)` · index `created_at` · FK ไปสมาชิก |
| 10 | `promotions` | โปร 3 ประเภท + `coupon_code` (**ไม่ unique**) + time window + `image_url` | + `branch_id`/`org_id` · unique coupon ต่อ org · usage limit |
| 11 | `payment_promotions` | โปรที่ใช้ในแต่ละบิล + `free_items JSONB` | + `branch_id` · index `payment_id` |
| 12 | `stock_logs` | ประวัติปรับสต็อกด้วยมือ — **append-only จริง (policy ถูกต้องที่สุดในระบบ)** | + `branch_id` · เพิ่ม trigger บังคับ |
| 13 | `item_ingredients` | รายการวัตถุดิบในใบสั่งซื้อ — **ไม่ผูกกับ `menu_items`** | + `branch_id` · **เพิ่ม recipe/BOM** |
| 14 | `points_logs` | ประวัติปรับแต้มด้วยมือ | + `org_id` · แก้ FK เมื่อเปลี่ยน PK สมาชิก |
| 15 | `purchase_orders` | หัวใบสั่งซื้อ | + `branch_id` · approval workflow |

**Index ที่มีอยู่ (2 ตัว):** `idx_item_ingredients_purchase_order_id`, `idx_purchase_orders_purchase_date`
**Trigger:** ไม่มีเลย
**Realtime publication:** `tables`, `orders`, `order_items`, `menu_items`, `qr_sessions` (5 ตาราง, ไม่มี filter, `REPLICA IDENTITY` ไม่ได้ตั้ง)

---

## 7.2 RPC Functions — 7 ตัว

| # | ฟังก์ชัน | Security | ปัญหาที่ต้องแก้ |
|:--:|---|:--:|---|
| 1 | `place_order_item(p_table_id, p_menu_item_id, p_quantity, p_unit_price, p_notes)` | DEFINER | 🔴 รับราคาจาก client · ล็อก `FOR UPDATE` ผิดตาราง (menu_items ไม่ใช่ orders) → เปิดบิลซ้ำได้ · overload 4-arg เก่ายังอยู่ |
| 2 | `customer_place_order_item(p_session_id, p_menu_item_id, p_quantity, p_unit_price, p_notes)` | DEFINER | 🔴 **รับราคาจาก browser ลูกค้าโดยไม่ตรวจ** — ช่องโหว่ที่รุนแรงที่สุดใน backend · expire session แบบ lazy · overload 4-arg เก่ายังอยู่ |
| 3 | `void_order_item(p_order_item_id, p_employee_name, p_reason, p_void_quantity)` | DEFINER | 🟠 คืนสต็อกโดย **match ข้อความไทย** · `p_employee_name` ปลอมได้ · overload 3-arg เก่ายังอยู่ |
| 4 | `complete_checkout(11 params)` | DEFINER | 🔴 **รับยอดเงินทุกช่องจาก client** · ไม่ตรวจสิทธิ์โปร · **ไม่มี idempotency/lock** · แต้มติดลบได้ · overload 8-arg และ 9-arg เก่ายังเรียกได้ (8-arg ไม่เขียน `phone_number`) |
| 5 | `add_employee(p_name, p_pin_hash, p_role)` | DEFINER | 🔴 **ไม่มี authorization check** — privilege escalation เต็มรูปแบบ |
| 6 | `update_employee(p_employee_id, p_name, p_pin_hash, p_role)` | DEFINER | 🔴 **ไม่มี authorization check** — เปลี่ยน role/PIN ใครก็ได้ |
| 7 | `delete_employee(p_employee_id, p_requester_pin_hash)` | DEFINER | ✅ **ตัวเดียวที่เช็คสิทธิ์จริงใน DB** (ต้อง owner + ห้ามลบตัวเอง) — แต่ bypass ได้ผ่าน `add_employee` |

> ⚠️ **สำคัญ:** `SECURITY DEFINER` ในระบบนี้ **ไม่ได้ให้สิทธิ์เพิ่มในทางปฏิบัติ** เพราะทุกตารางมี policy `USING (true)` สำหรับ anon อยู่แล้ว — anon key เขียนตรงได้เหมือนกัน
>
> ⚠️ **ไม่มี `DROP FUNCTION` ในทุก migration** → overload เก่าทุกเวอร์ชันยังคงอยู่และเรียกได้ และอาจเกิด `function ... is not unique` เพราะพารามิเตอร์ใหม่มี default

---

## 7.3 Migrations — 25 ไฟล์ (เรียงตามชื่อไฟล์)

| # | ไฟล์ | เนื้อหา |
|:--:|---|---|
| 1 | `20260705_init_schema.sql` | 9 ตารางตั้งต้น + seed + `place_order_item` + RLS |
| 2 | `20260707_customer_order_rpc.sql` | `customer_place_order_item` + RLS `qr_sessions` |
| 3 | `20260707_happy_hour_and_payment.sql` | ราคา Happy Hour + `complete_checkout` |
| 4 | `20260707_void_order_item.sql` | `void_order_item` + RLS `void_logs` |
| 5 | `20260718_stock_and_reports.sql` | `is_stock_tracked` + อัปเดต RPC |
| 6 | `20260718_stock_logs.sql` | ตาราง `stock_logs` (**ไม่มี `IF NOT EXISTS`**) |
| 7 | `20260719_menu_categories.sql` | คอลัมน์ `category` + seed เมนูเพิ่ม |
| 8 | `20260720_ingredient_cost.sql` | ตาราง `item_ingredients` |
| 9 | 🔴 `20260720_payment_promotions.sql` | `payment_promotions` — **เรียงก่อน `promotions` ที่มันอ้างถึง (`pa` < `pr`) → `db reset` พัง** |
| 10 | `20260720_promotion_happy_hour.sql` | `start_time` / `end_time` |
| 11 | `20260720_promotion_menu_item.sql` | FK `menu_item_id` |
| 12 | `20260720_promotions.sql` | ตาราง `promotions` |
| 13 | `20260720_special_notes.sql` | `notes` ใน `order_items` + RPC เป็น DEFINER |
| 14 | `20260721_loyalty_crm.sql` | `points_logs` + `payments.phone_number` |
| 15 | `20260725_menu_item_image_url.sql` | `menu_items.image_url` |
| 16 | `20260725_partial_void.sql` | void บางส่วน (`p_void_quantity`) |
| 17 | `20260725_promotion_image_url.sql` | `promotions.image_url` |
| 18 | `20260728_employee_management.sql` | 🔴 `add_employee` / `update_employee` / `delete_employee` |
| 19 | `20260730_enable_realtime.sql` | เพิ่ม 5 ตารางเข้า publication — 🔴 `EXCEPTION WHEN OTHERS THEN NULL` กลืน error ทั้งหมด |
| 20 | `20260801_fix_payment_promotions_fk.sql` | ลด `NOT NULL` เพื่อให้ `SET NULL` ทำงาน |
| 21 | `20260808_fix_phone_number_in_checkout.sql` | แก้ `phone_number` ไม่ถูกบันทึก (นิยาม `complete_checkout` ล่าสุด) |
| 22 | `20260808_payment_split_amounts.sql` | `cash_amount` / `promptpay_amount` + backfill |
| 23 | `20260808_purchase_orders.sql` | ตาราง `purchase_orders` + **2 index เดียวของทั้งระบบ** |
| 24 | `20260813_fix_place_order_table_status.sql` | นิยามล่าสุดของ 2 RPC สั่งอาหาร |
| 25 | `20260813_menu_item_unit.sql` | `menu_items.unit` |

---

## 7.4 โครงสร้างโฟลเดอร์จริง

> ใช้แทนผังใน `AGENTS.md` และ `ROADMAP.md` ซึ่งยังเป็นผังก่อน refactor (2026-08-07)

```
yokayaki/
├── app/                                   # 2 routes เท่านั้น
│   ├── layout.tsx                         #   AuthProvider + Noto Sans Thai + viewport lock
│   ├── page.tsx                           #   23 บรรทัด: PinPad ↔ TableMap switcher
│   ├── globals.css                        #   Tailwind + typography utility 17 ตัว
│   └── customer/[session_id]/page.tsx     #   1,235 บรรทัด — Customer QR Portal
│
├── components/
│   ├── *.tsx                              # 13 ไฟล์ re-export shim (1-2 บรรทัด) จาก refactor
│   ├── EmployeeManager.tsx                # 745 — ไฟล์เดียวที่ยังไม่ย้ายเข้าโฟลเดอร์
│   ├── common/                            # PinPad · TableMap (app shell) · TableCard · SidebarNav
│   ├── order/                             # POSOrderScreen · MenuGrid · CartPanel
│   │                                      # SpecialNoteModal · VoidItemModal · CustomerQRModal
│   ├── checkout/                          # CheckoutScreen · OrderSummaryCard · CRMMemberCard
│   │                                      # CouponInputCard · PaymentCard · PromptPayQRModal
│   │                                      # ReceiptPrintView
│   ├── kitchen/                           # KitchenScreen · KitchenOrderCard
│   ├── menu/                              # MenuManager · MenuItemModal
│   ├── stock/                             # StockManager (wrapper) · IngredientPurchaseManager
│   ├── promo/                             # PromoManager
│   ├── sales/                             # SalesHistory · SalesSummaryCards · ClosedBillTable
│   │                                      # BillDetailModal · VoidLogsTable
│   ├── loyalty/                           # LoyaltyManager · MemberInfoCard · PointsHistoryModal
│   ├── dashboard/                         # OwnerDashboard · DateFilterBar · TopKPICards
│   │                                      # BusinessSpotlight · SalesChart · BusinessKPIs
│   │                                      # PromoActivityStream · TopDishes
│   └── ui/                                # button · card · table · select · pagination
│                                          # date-picker · chart  (เขียนเองทั้งหมด)
│
├── context/AuthContext.tsx                # 281 — PIN auth + lockout + auto-lock
├── lib/
│   ├── supabase.ts                        # 6 — anon client singleton
│   ├── audioNotifier.ts                   # 115 — Web Audio chime สังเคราะห์เอง
│   ├── useDateFilter.ts                   # 89 — date range engine
│   └── utils.ts                           # 6 — cn()
│
├── supabase/migrations/                   # 25 ไฟล์ SQL
├── agent/rules/                           # main.md (5 hard safety rules) · setting.md
├── docs/superpowers/                      # specs/ (18) · plans/ (34)
├── test-rpc.mjs                           # ⚠️ สคริปต์เดี่ยว ยิง production ได้
├── next.config.ts                         # allowedDevOrigins (hardcode) + security headers
└── package.json
```

---

## 7.5 กฎความปลอดภัยที่โปรเจกต์ตั้งไว้เอง

จาก `agent/rules/main.md` — ห้ามละเมิด 5 ข้อนี้เวลาแก้โค้ด:

1. ❌ ห้ามแก้ RPC ที่เป็น `SECURITY DEFINER` โดยไม่ระวัง
2. ❌ ห้ามแก้ RLS policies โดยพลการ
3. ❌ ห้ามเอา PIN hashing + JS fallback ออก
4. ❌ ห้ามปิด `FOR UPDATE` lock ใน RPC ที่หักสต็อก
5. ❌ ห้ามเอาการเช็ค `is_stock_tracked` ออก

> ⚠️ **ข้อควรระวัง:** กฎข้อ 1 และ 2 ขัดกับสิ่งที่ Phase 0 ต้องทำ (แก้ทั้ง RPC และ RLS) — **กฎนี้ควรถูกปรับใหม่พร้อมกับ Phase 0** ให้เป็น "ห้ามแก้โดยไม่มี test ครอบและไม่มี review" แทนการห้ามเด็ดขาด

---

## 7.6 Environment Variables

| ตัวแปร | ปัจจุบัน | ปัญหา | ต้องเป็น |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | fallback `'https://placeholder.supabase.co'` → build ผ่านทั้งที่ config ผิด | ต้อง throw ตอน boot |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | 🔴 RLS เปิดหมด → key นี้ = full DB access | RLS ต้องปิด anon เกือบทั้งหมด |
| `NEXT_PUBLIC_PROMPTPAY_ID` | public | 🔴 fallback `'0899999999'` เงียบๆ · ผูกกับร้านเดียว | ย้ายเข้า `org_settings` ใน DB |
| *(ยังไม่มี)* `SUPABASE_SERVICE_ROLE_KEY` | — | — | เพิ่มใน Phase 1 (server-only **ห้าม** `NEXT_PUBLIC_`) |

---

## 📌 สรุปสั้นที่สุด

| คำถาม | คำตอบ |
|---|---|
| **โปรเจกต์นี้คืออะไร** | Hybrid POS สำหรับร้านอิซากายะเล็ก — staff terminal + customer QR self-order + KDS realtime + checkout ครบวงจร · Next.js 16 + Supabase · ~14,300 บรรทัด · 214 commits |
| **มีฟีเจอร์กี่อย่าง** | **14 โมดูล · ~65 ความสามารถย่อย · 15 ตาราง · 7 RPC** — ครอบคลุมตั้งแต่รับออเดอร์ถึงรายงานผู้บริหาร ระดับที่แข่งขันได้จริงในตลาด |
| **ต้องเพิ่มอะไรเพื่อเป็น Enterprise SaaS** | เรียงตามความสำคัญ: **① Security** (RLS/PIN/RPC — ทำก่อนอย่างอื่นทั้งหมด) → **② Server tier** → **③ Data integrity + tests** → **④ Multi-tenancy** (งานใหญ่สุด) → **⑤ Auth & RBAC** → **⑥ Billing** → **⑦ Reliability & Observability** → **⑧ Enterprise features** → **⑨ Compliance** |
| **ประเมินเวลา** | ~7–9 เดือน (1 คน) หรือ ~4–5 เดือน (ทีม 2–3 คน) ถึง MVP ของ SaaS |
| **สถานะโดยรวม** | 🟢 **Product 4.5/5** · 🔴 **ฐานราก SaaS ~0.5/5** — มี "หัว" ที่ดีมาก แต่ยังไม่มี "ขา" |

---

*เอกสารนี้สร้างจากการอ่านโค้ดจริงทั้ง repo (211 ไฟล์) ทุกตัวเลขยืนยันด้วยคำสั่งที่ระบุไว้ในหัวข้อ 1.3 และ 7.x*
