# 🧭 Yokayaki POS — Module & Milestone Tracker

> **ไฟล์นี้คือกระดานติดตามงาน** — อัปเดตทุกครั้งที่ปิดงานหรือเปลี่ยนสถานะ
>
> ที่มาของรายการงาน: [`PosRestuarantSass.md`](PosRestuarantSass.md) (§4 Gap Analysis + §5 Roadmap)
> ประวัติฟีเจอร์ที่ทำไปแล้ว: [`ROADMAP.md`](ROADMAP.md) · สเปกรายฟีเจอร์: `docs/superpowers/specs/`

**Last Updated:** 2026-08-29 · **Milestone ปัจจุบัน:** `M3 Testing Foundation`

---

## สัญลักษณ์สถานะ

| สัญลักษณ์ | ความหมาย |
|:--:|---|
| 🟢 | เสร็จ + ยืนยันแล้ว (มีหลักฐาน: test / script / migration ที่รันจริง) |
| ⚠️ | เสร็จบางส่วน — ปิดช่องหลักแล้วแต่ยังเหลือหาง (ระบุไว้ในคอลัมน์หมายเหตุ) |
| 🟡 | กำลังทำ |
| ⬜ | ยังไม่เริ่ม |
| ⛔ | บล็อก — รอ milestone อื่นก่อน |

**ระดับความยาก:** `S` = 1–3 วัน · `M` = 1–2 สัปดาห์ · `L` = 3–6 สัปดาห์ · `XL` = 2 เดือนขึ้นไป

---
---

# 1. Module Registry

## 1.1 โมดูลผลิตภัณฑ์ (Product Modules — ผู้ใช้เห็น)

| ID | โมดูล | ไฟล์หลัก | สถานะ | หนี้ที่ค้างอยู่ | Milestone ที่จะเก็บ |
|---|---|---|:--:|---|:--:|
| `P-AUTH` | Auth & RBAC | `context/AuthContext.tsx` · `components/PinPad.tsx` · `app/api/auth/*` | 🟢 | ยังเป็น PIN ชั้นเดียว ไม่มี Supabase Auth · role มีแค่ 2 ระดับ | M5 |
| `P-FLOOR` | Table Map / App Shell | `components/TableMap.tsx` · `SidebarNav.tsx` | 🟢 | — | M2 |
| `P-POS` | POS Order (Staff) | `components/POSOrderScreen.tsx` | 🟢 | — | M2 |
| `P-QR` | Customer QR Portal | `app/customer/[session_id]/page.tsx` · `app/api/customer/*` | 🟢 | ไฟล์ยาว 1,235 บรรทัด ควรแตก · polling 5 วิ แทน realtime | M2 / M7 |
| `P-KDS` | Kitchen Display | `components/KitchenScreen.tsx` | 🟢 | L10 ปิดใน Sprint E | M2 |
| `P-PAY` | Checkout & Payment | `components/checkout/CheckoutScreen.tsx` | 🟢 | ปิด A5 / A6 / L1 แล้ว · เหลือหนี้เชิงโครงสร้าง: เครื่องคิดโปรยังมี 2 ชุด (SQL ของจริง + JS สำหรับแสดงผล) ต้องแก้คู่กันเสมอ | M2 |
| `P-MENU` | Menu Manager | `components/MenuManager.tsx` · `MenuItemModal.tsx` | 🟢 | L2/L4 ปิดใน Sprint C | M2 |
| `P-STOCK` | Purchase Orders / Stock | `components/IngredientPurchaseManager.tsx` | 🟢 | L6/L16 ปิดใน Sprint D | M2 |
| `P-PROMO` | Promo Manager | `components/PromoManager.tsx` | 🟢 | L3 ปิดใน Sprint D | M2 |
| `P-REPORT` | Sales History | `components/SalesHistory.tsx` | 🟢 | join ด้วยมือ 4 ขั้น · paginate ใน JS | M2 / M8 |
| `P-CRM` | Loyalty CRM | `components/LoyaltyManager.tsx` | 🟢 | L7 ปิดใน Sprint D · PK เป็นเบอร์โทร (ปัญหา PDPA) | M2 / M9 |
| `P-DASH` | Owner Dashboard | `components/dashboard/*` | 🟢 | L11–L13 ปิดใน Sprint E · ~9 round-trip ยังเหลือ | M2 / M8 |
| `P-EMP` | Employee Manager | `components/EmployeeManager.tsx` · `app/api/employees/*` | 🟢 | — (ปิด A3 แล้ว) | — |
| `P-UI` | Design System | `app/globals.css` · shared components | ⚠️ | `alert()` ปนกับ toast · loading state ไม่เป็นมาตรฐาน · dep ที่ติดตั้งแล้วไม่ใช้ | M2 |

## 1.2 โมดูลฐานราก (Foundation Modules — ผู้ใช้ไม่เห็น แต่ตัดสินว่าขายได้ไหม)

| ID | โมดูล | ขอบเขต | สถานะ | Milestone เจ้าของ |
|---|---|---|:--:|:--:|
| `F-SEC` | Security & RLS | policy ทุกตาราง · grant/revoke · PIN · rate limit | 🟢 | M0 |
| `F-API` | Server Tier | `app/api/*` · service-role · zod · transaction เดียวต่อออเดอร์ | 🟢 | operational mutations ผ่าน API แล้ว · owner menu/promo/loyalty/stock ยัง client+RLS |
| `F-DATA` | Data Integrity & Scale | index · atomic · timezone · migration hygiene · aggregation | 🟢 | migration hygiene ยังไม่ idempotent ทั้งชุด (ไฟล์เก่าก่อน M0) | M2 / M8 |
| `F-TEST` | Testing & CI | unit · integration (RPC/RLS) · E2E · GitHub Actions | 🟡 | CI + smoke E2E แล้ว · ยังไม่ครอบ flow เต็ม | M3 |
| `F-TENANT` | Multi-Tenancy | organizations / branches / memberships / org_settings | ⬜ | M4 |
| `F-AUTHZ` | Auth & Permission Matrix | Supabase Auth · JWT claim · role 5 ระดับ | ⬜ | M5 |
| `F-BILL` | Billing & Subscription | plans / subscriptions / usage / gateway / trial | ⬜ | M6 |
| `F-OPS` | Reliability & Operations | offline queue · backup/PITR · staging · deploy | ⬜ | M7 |
| `F-OBS` | Observability | Sentry · structured log · alerting · provider dashboard | ⬜ | M7 |
| `F-ENT` | Enterprise Features | multi-branch report · BOM · ESC/POS · webhook · open API | ⬜ | M8 |
| `F-LEGAL` | Compliance & Legal | PDPA · VAT / e-Tax · append-only audit · retention | ⬜ | M9 |

---
---

# 2. Milestones

| # | Milestone | โมดูลหลัก | เกณฑ์ผ่าน (Exit Criteria) | ประมาณการ | สถานะ |
|:--:|---|---|---|:--:|:--:|
| **M0** | 🔴 Security Hardening | `F-SEC` `P-PAY` | A1–A7 ปิดครบ · `verify-lockdown.mjs` ผ่านทุกข้อ · ไม่มี mutation ใดที่เชื่อตัวเลขจาก client | 3–4 สัปดาห์ | 🟢 |
| **M1** | 🛡️ Server Tier | `F-API` | ทุก mutation ผ่าน route handler · zod ทุก payload · rate limit ฝั่ง server · 1 ออเดอร์ = 1 transaction | 3–4 สัปดาห์ | 🟢 operational path ปิดแล้ว · owner CRUD ยัง client |
| **M2** | 🔧 Data Integrity & Bug Sweep | `F-DATA` + product modules | L1–L18 ปิดครบ · index H1 ครบ · `supabase db reset` บน DB เปล่าผ่าน · timezone ถูกทุกหน้า | 2–3 สัปดาห์ | 🟢 |
| **M3** | 🧪 Testing Foundation | `F-TEST` | E2E สั่ง→ครัว→เช็คบิลผ่านใน CI · integration test ครอบทุก RPC + RLS · CI บล็อก PR ที่ fail | 2–3 สัปดาห์ | 🟡 |
| **M4** | 🏢 Multi-Tenancy | `F-TENANT` | 2 org ในฐานเดียวกันมองข้ามกันไม่ได้ (พิสูจน์ด้วย test) · ไม่มี config ร้านค้างใน env/hardcode | 6–10 สัปดาห์ | ⛔ รอ M3 |
| **M5** | 🔑 Auth & RBAC | `F-AUTHZ` `P-AUTH` | Supabase Auth + JWT claim `org_id`/`role` · role 5 ระดับบังคับที่ DB · revoke session ได้ | 3–5 สัปดาห์ | ⛔ รอ M4 |
| **M6** | 💰 Billing | `F-BILL` | สมัครเอง→ทดลอง→จ่ายเงิน→ตัดรอบ ครบวง · feature gating ตาม plan · dunning ทำงาน | 4–6 สัปดาห์ | ⛔ รอ M5 |
| **M7** | 🔄 Reliability & Observability | `F-OPS` `F-OBS` | ขายต่อได้ตอนเน็ตหลุดแล้ว sync กลับถูก · PITR + ทดสอบ restore สำเร็จ · Sentry + alert ยิงจริง | 5–7 สัปดาห์ | ⛔ รอ M6 |
| **M8** | 🏗️ Enterprise Features | `F-ENT` | multi-branch report · COGS รายจานจาก BOM · KOT ออกเครื่องพิมพ์จริง · payment webhook reconcile | 3–6 เดือน | ⛔ รอ M7 |
| **M9** | ⚖️ Compliance | `F-LEGAL` | consent + export + delete ทำได้จริง · VAT / ใบกำกับเต็มรูป · audit log แก้ไม่ได้ | 2–3 เดือน | ⛔ รอ M8 |

> **ถึง MVP ของ SaaS (M0–M7):** ~7–9 เดือน (1 คนเต็มเวลา) หรือ ~4–5 เดือน (ทีม 2–3 คน)

---
---

# 3. Task Board

## M0 — 🔴 Security Hardening `🟡 กำลังทำ`

| ID | งาน | ยาก | สถานะ | หลักฐาน / หางที่เหลือ |
|---|---|:--:|:--:|---|
| A1 | anon key = full DB credential | `XL` | 🟢 | `20260824_security_hardening.sql` เขียน RLS ใหม่ + REVOKE/GRANT · anon ไม่เหลือ policy และ grant · หน้าลูกค้าไม่ถือ credential แล้ว |
| A2 | PIN hash ถอดได้ในไม่กี่วินาที | `M` | 🟢 | bcrypt + `verify_pin()` (service_role เท่านั้น) + `pin_attempts` · `20260825_pin_lockout_hardening.sql` ตัดทางเดิน SHA-256 + `DROP COLUMN employees.pin_hash` + เพดานรวมทั้งระบบ 20 ครั้ง/5 นาที · `clientKeyFrom()` เลิกเชื่อ `x-forwarded-for` ตัวซ้ายสุด |
| A3 | Privilege escalation ผ่าน `add_employee` | `S` | 🟢 | DROP RPC เดิม 3 ตัว → `admin_*` ที่ให้เฉพาะ `service_role` + step-up PIN ที่ `/api/employees/[id]` |
| A4 | ลูกค้ากำหนดราคาเองได้ | `S` | 🟢 | `20260826_order_price_server_side.sql` ลบ `p_unit_price` ออกจาก `place_order_item` และ `customer_place_order_item` · ราคาอ่านจาก `menu_items.price` ใน DB · กัน `quantity <= 0` · แก้ผู้เรียกทั้ง 2 ที่ (POSOrderScreen + customer order route) · **Happy Hour ยังคิดจาก `price` ตามเดิม — เป็นเรื่องราคาขาย ไปตัดสินที่ L2** |
| A5 | ยอดขายคือสิ่งที่เบราว์เซอร์บอก | `M` | 🟢 | `20260827_checkout_server_side.sql` — `complete_checkout` รับแค่ `p_cash_received` / `p_coupon_code` / `p_phone_number` / `p_points_redeem` · subtotal จาก `order_items` · โปรโมชั่นอ่านเงื่อนไข (`is_active`/วันที่/`min_order_amount`/ช่วงเวลา/เมนู) จากตารางเอง · แต้ม redeem clamp ด้วย `LEAST(ที่ขอ, แต้มที่มี, ยอดหลังหักโปร)` + `CHECK (points >= 0)` · ใบเสร็จพิมพ์จากค่าที่ DB คืนกลับมา · อัตราแต้ม `net / 10` (ปิด L1) |
| A6 | Checkout ไม่มี idempotency | `S` | 🟢 | ไฟล์เดียวกัน — `SELECT ... FOR UPDATE` บน order + เช็ค `status <> 'active'` แล้วคืนใบเดิม (`already_completed`) ไม่แตะแต้มซ้ำ + `UNIQUE INDEX uniq_payment_per_order` |
| A7.1 | Seed PIN อยู่ใน git | `S` | 🟢 | migration ล้าง hash ของ seed PIN ที่รู้จัก · ตั้ง PIN จริงด้วย `scripts/set-pin.mjs` |
| A7.2 | ไม่มี `DROP FUNCTION` → overload เก่ายังเรียกได้ | `S` | 🟢 | `20260824` §5 drop ไป 5 ตัว · `20260826` drop รุ่นที่รับ `p_unit_price` · `20260827` drop `complete_checkout` 11 args · ไม่เหลือ overload เก่าที่เรียกได้แล้ว |
| A7.3 | หน้าลูกค้าเขียน `tables` ตรงจาก anon | `S` | 🟢 | ย้ายไป `/api/customer/[session_id]/check-bill` ที่ตรวจ session ก่อนทุกครั้ง |
| A7.4 | เปิดบิลซ้ำต่อโต๊ะได้ (ล็อกผิดตาราง) | `S` | 🟢 | `20260826` ล็อกแถว `tables` ก่อนหาบิล active + `20260828` เพิ่ม `uniq_active_order_per_table` (partial unique index) · migration หยุดพร้อมรายชื่อโต๊ะถ้ามีบิลซ้ำค้างอยู่ · เทสต์ยืนยันว่า INSERT บิลที่สองถูกปฏิเสธ |
| A7.5 | `void_order_item` ตัดสินคืนสต็อกด้วยข้อความไทย | `S` | 🟢 | `20260828` รับ `p_reason_code` แทนข้อความ · รหัสที่ไม่รู้จักถูกปฏิเสธ (ไม่เดาแล้วทำต่อ) · `lib/voidReasons.ts` เป็นรายการเดียวที่ POS กับครัวใช้ร่วมกัน (ปิด L15 ไปด้วย) · คงพฤติกรรมเดิม: มีเฉพาะ `wrong_key` ที่คืนสต็อก |
| A7.6 | audit trail ปลอมได้ (`employee_name` จาก client) | `M` | 🟢 | `jwt_emp_id()` / `jwt_emp_name()` อ่าน claim จาก JWT · `void_logs` เพิ่ม `employee_id` + `reason_code` และเลิกรับชื่อจาก payload · `purchase_orders` เพิ่ม `created_by_emp_id/name` ที่ trigger ประทับจาก JWT (ยังแก้ `buyer_name` ซึ่งเป็นข้อมูลธุรกิจได้ตามจริง) |
| A7.7 | `orders.table_id` เป็น `ON DELETE CASCADE` | `S` | 🟢 | `20260828` เปลี่ยน `orders.table_id` และ `payments.order_id` เป็น `RESTRICT` · เทสต์ยืนยันว่าลบโต๊ะที่มีประวัติไม่ได้และ `payments` ไม่หาย |
| A7.8 | env ไม่ตั้งแล้ว fallback เงียบๆ | `S` | 🟢 | `lib/supabase.ts` / `lib/supabaseAdmin.ts` โยน error เมื่อไม่มีค่า · `CheckoutScreen` เลิก fallback `'0899999999'` — ถ้าไม่ได้ตั้ง PromptPay จะซ่อนปุ่ม QR แล้วขึ้นคำเตือนว่ารับได้เฉพาะเงินสด แทนที่จะให้ลูกค้าโอนเข้าเบอร์คนอื่น |
| A7.9 | Realtime broadcast ไม่มี filter | `M` | 🟢 | หน้าลูกค้าไม่ subscribe แล้ว · POS กรอง `orders` ด้วย `table_id` และ `order_items` ด้วย `order_id` · Checkout ฟังเฉพาะบิลใบที่กำลังปิด · ที่เหลือ (ครัว / ผังโต๊ะ / badge) เป็น store-wide **โดยเจตนา** เพราะต้องเห็นทั้งร้าน และมี RLS + JWT พนักงานคุมอยู่ |
| A7.10 | `test-rpc.mjs` ยิง production | `S` | 🟢 | ลบไฟล์แล้ว (commit `ecb665c`) |

**ปิดครบ 16 / 16** — `node scripts/verify-lockdown.mjs` ผ่านทุกข้อบน production (2026-08-29)

> เจอเพิ่มระหว่างทำ (ปิดแล้วในไฟล์เดียวกัน): `authenticated` ได้ `GRANT ALL` บนทุกตารางจาก default privileges ของ Supabase → **TRUNCATE payments ได้** เพราะ RLS ไม่คุม TRUNCATE
> และ `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` ใน `20260824` **ไม่มีผลจริง** (พิสูจน์บน PG17) ⇒ ทุก RPC ใหม่ต้อง `REVOKE` เองเสมอ ไม่มีตาข่ายรอง

เกณฑ์ผ่าน M0: ทุกแถวเป็น 🟢 และ `node scripts/verify-lockdown.mjs` ขึ้น "ปิดแล้ว" ครบทุกข้อ

## M1 — 🛡️ Server Tier `🟢 operational path ปิดแล้ว`

| ID | งาน | สถานะ | หมายเหตุ |
|---|---|:--:|---|
| D1 | Route handlers + service-role client | 🟢 | `app/api/auth/*` · `app/api/customer/*` · `app/api/employees/*` |
| D2 | ย้ายการคำนวณราคา/ยอดเงินทั้งหมดเข้า server | 🟢 | ราคาต่อหน่วย (A4) + ยอดบิล/ส่วนลด/แต้ม (A5) คำนวณใน DB ครบแล้ว |
| D3 | ส่งออเดอร์เป็น transaction เดียว | 🟢 | `20260829_order_batch_rpc.sql` · `POST /api/orders` · `place_order_batch` / `customer_place_order_batch` · POS + customer route ใช้ batch แล้ว · ทดสอบ `supabase/tests/order_batch.sql` |
| D4 | Idempotency key ตอน checkout | 🟢 | ใช้ `UNIQUE(payments.order_id)` + `FOR UPDATE` เป็นตัวกันซ้ำแทน key จาก client (= A6) — หนึ่งออเดอร์มีได้ใบเดียวเป็น invariant ที่แข็งกว่า |
| D5 | Input validation ด้วย zod ทุก endpoint | 🟢 | `lib/api/schemas.ts` + `lib/api/parse.ts` · ครอบทุก route ใน `app/api/` ที่รับ body/params |
| D6 | Rate limiting ฝั่ง server ที่ปลอม header ไม่ได้ | 🟢 | `lib/rateLimit.ts` · login · orders · customer order/state/check-bill · owner step-up PIN |
| D7 | Audit log ผูกกับ identity จาก JWT | 🟢 | ปิดใน A7.6 (`jwt_emp_id/name` + void_logs) — M1 ไม่มี mutation ใหม่ที่รับชื่อจาก client |
| D8 | Webhook receiver สำหรับ payment gateway | ⬜ | ของจริงไปโผล่ที่ M8 |

## M2 — 🔧 Data Integrity & Bug Sweep `🟢`

**H1 · Index — 🟢 11/11** — `20260830_performance_indexes.sql` (+ `uniq_payment_per_order` · `uniq_active_order_per_table` จาก M0 · PO indexes จาก `20260808`)

**Bug L1–L18 — 🟢 18/18 (Sprint F ปิด L14 · L17)**

| ID | สรุป | โมดูล | ID | สรุป | โมดูล |
|---|---|---|---|---|---|
| ~~L1~~ | 🟢 ตัดสินแล้ว: `net / 10` (ทำใน A5) | `P-PAY` | ~~L10~~ | 🟢 ปิดเสียงไม่ re-subscribe channel | `P-KDS` |
| ~~L2~~ | 🟢 `menu_item_sale_price` + RPC สั่งอาหาร (17:00–19:00) | `P-MENU` | ~~L11~~ | 🟢 preset 3/6 เดือนใน DateFilterBar | `P-DASH` |
| ~~L3~~ | 🟢 PromoManager มี image_url + วันที่ | `P-PROMO` | ~~L12~~ | 🟢 สมาชิกใหม่ตามช่วงวันที่ | `P-DASH` |
| ~~L4~~ | 🟢 MenuItemModal แก้ stock / HH ได้แล้ว | `P-MENU` | ~~L13~~ | 🟢 `lib/storeDateRange` Asia/Bangkok | `P-DASH` |
| ~~L5~~ | 🟢 staff ไม่เห็น SalesHistory | `P-FLOOR` | ~~L14~~ | 🟢 `ALLOWED_DEV_ORIGINS` ใน env | config |
| ~~L6~~ | 🟢 `upsert_purchase_order` atomic | `P-STOCK` | ~~L15~~ | 🟢 ใช้ `lib/voidReasons.ts` ร่วมกันแล้ว | `P-KDS` |
| ~~L7~~ | 🟢 `adjust_loyalty_points` + lock | `P-CRM` | ~~L16~~ | 🟢 `price_per_unit` ใน DB + RPC | `P-STOCK` |
| ~~L8~~ | 🟢 `place_order_batch` ใน D3 | `P-POS` | ~~L17~~ | 🟢 DROP `discount_applied` | migration |
| ~~L9~~ | 🟢 cart merge ดู id + notes | `P-POS` | ~~L18~~ | 🟢 trigger `tables_status_updated_at` | migration |

**Sprint F (Config + schema cleanup) — 🟢**
- [x] L14 — `next.config.ts` อ่าน `ALLOWED_DEV_ORIGINS` จาก env (ไม่ hardcode LAN IP)
- [x] L17 — `20260833_sprint_f_drop_discount_applied.sql` · ลบ UI อ้างอิงใน SalesHistory/BillDetailModal
- [x] L5 — `SidebarNav` + `TableMap` ซ่อน SalesHistory จาก staff
- [x] L10 — `KitchenScreen` ใช้ `soundEnabledRef` ไม่ re-subscribe realtime
- [x] L11 — `DateFilterBar` แสดง preset 3/6 เดือน
- [x] L12 — `BusinessKPIs` นับสมาชิกใหม่ในช่วงวันที่
- [x] L13 — `lib/storeDateRange.ts` ใช้ทุก dashboard query

**Sprint D (Promo + Stock + CRM) — 🟢**
- [x] L3 — `PromoManager` ช่อง `image_url` · `start_date` · `end_date`
- [x] L6 — `upsert_purchase_order` แก้ PO ใน transaction เดียว
- [x] L7 — `adjust_loyalty_points` ล็อกแถว + audit จาก JWT
- [x] L16 — คอลัมน์ `price_per_unit` + บันทึกจาก RPC

**Sprint C (POS + เมนู) — 🟢**
- [x] L2 — `20260831_sprint_c_pos_menu.sql` · `lib/menuPrice.ts` · RPC ใช้ `menu_item_sale_price`
- [x] L4 — `MenuItemModal` มี stock / `is_stock_tracked` / Happy Hour
- [x] L9 — `POSOrderScreen` merge cart ด้วย id + notes
- [x] L18 — trigger อัปเดต `tables.updated_at` เมื่อ `status` เปลี่ยน

**Migration hygiene — ⚠️ Sprint A ปิดส่วนหลักแล้ว**

- [x] **เรียงชื่อไฟล์ promotion** — `20260720_promotions_happy_hour` · `promotions_menu_item` · `promotions_payment_promotions` เรียงหลัง `20260720_promotions.sql` · ลบ shim ใน `10-apply-migrations.sh`
- [ ] ทำทุก migration idempotent (`IF NOT EXISTS` / guard บน `CREATE POLICY`) — ยังไม่ครบทั้งชุด (ไฟล์เก่าก่อน M0)
- [x] เอา `EXCEPTION WHEN OTHERS THEN NULL` ออกจาก `20260730_enable_realtime.sql` — ใช้เช็ค `pg_publication_tables` แทน
- [x] ตั้ง `REPLICA IDENTITY FULL` บน tables/orders/order_items/menu_items/qr_sessions

## M3 — 🧪 Testing Foundation `🟡`

- [ ] unit: คำนวณโปรโมชั่น · แต้ม · EMVCo payload + CRC
- [x] โครง integration test: `docker-compose.yml` + `supabase/tests/*.sql` → `pnpm db:up && pnpm db:test`
- [x] CI: `.github/workflows/ci.yml` — lint · build · `db:test` · Playwright smoke
- [ ] integration: ขยายให้ครบ **ทุก** RPC + ทุก RLS policy
- [x] E2E scaffold: Playwright `e2e/smoke.spec.ts` (PIN pad)
- [x] E2E full flow: `e2e/full-flow.spec.ts` (สั่ง→ครัว→เช็คบิล) · รันเมื่อมี Supabase env จริง · CI ต้องตั้ง GitHub secrets
- [ ] `supabase gen types typescript` แทน type ที่เขียนมือ

## M4–M9 `⛔ รอ milestone ก่อนหน้า`

ขอบเขตงานละเอียดอยู่ใน [`PosRestuarantSass.md`](PosRestuarantSass.md) — §B (M4) · §C (M5) · §E (M6) · §F + §G (M7) · §J (M8) · §I (M9)

แตกเป็น task board เมื่อ milestone ก่อนหน้าผ่านเกณฑ์แล้วเท่านั้น — กันกระดานบวมด้วยงานที่ขอบเขตยังเปลี่ยนได้

---
---

# 4. วิธีใช้ไฟล์นี้

1. **เริ่มงานใหม่** → หา task ID ในกระดานของ milestone ปัจจุบัน ถ้ายังไม่มีให้เพิ่มแถวก่อนลงมือ
2. **ปิดงาน** → เปลี่ยนเป็น 🟢 **พร้อมหลักฐาน** ในคอลัมน์หมายเหตุ (ชื่อ migration / commit / คำสั่งที่รันแล้วผ่าน) — ห้ามติ๊ก 🟢 โดยไม่มีหลักฐาน
3. **ปิดได้ครึ่งเดียว** → ⚠️ แล้วเขียนให้ชัดว่าเหลืออะไร ที่ไฟล์ไหน บรรทัดไหน
4. **ปิด milestone** → ทุกแถวเป็น 🟢 และเกณฑ์ผ่านใน §2 ครบ แล้วค่อยขยับ "Milestone ปัจจุบัน" ที่หัวไฟล์
5. **อัปเดต `Last Updated`** ทุกครั้งที่แก้ไฟล์นี้
6. เจอปัญหาใหม่ระหว่างทาง → เพิ่มลงกระดานของ milestone ที่เหมาะ **และ** ลง `PosRestuarantSass.md` ให้สองไฟล์ตรงกันเสมอ
