# 🧭 Yokayaki POS — Module & Milestone Tracker

> **ไฟล์นี้คือกระดานติดตามงาน** — อัปเดตทุกครั้งที่ปิดงานหรือเปลี่ยนสถานะ
>
> ที่มาของรายการงาน: [`PosRestuarantSass.md`](PosRestuarantSass.md) (§4 Gap Analysis + §5 Roadmap)
> ประวัติฟีเจอร์ที่ทำไปแล้ว: [`ROADMAP.md`](ROADMAP.md) · สเปกรายฟีเจอร์: `docs/superpowers/specs/`

**Last Updated:** 2026-08-26 · **Milestone ปัจจุบัน:** `M0 Security Hardening` (🟡 กำลังทำ — คิวถัดไป: A7.4 / A7.5 / A7.6 / A7.7)

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
| `P-FLOOR` | Table Map / App Shell | `components/TableMap.tsx` · `SidebarNav.tsx` | 🟢 | L5 staff เห็น SalesHistory ผิดสเปก · nav markup ซ้ำ 3 ชุด | M2 |
| `P-POS` | POS Order (Staff) | `components/POSOrderScreen.tsx` | 🟢 | L8 ส่งออเดอร์เป็น loop ไม่ atomic · L9 cart merge ไม่ดูโน้ต | M2 |
| `P-QR` | Customer QR Portal | `app/customer/[session_id]/page.tsx` · `app/api/customer/*` | 🟢 | ไฟล์ยาว 1,235 บรรทัด ควรแตก · polling 5 วิ แทน realtime | M2 / M7 |
| `P-KDS` | Kitchen Display | `components/KitchenScreen.tsx` | 🟢 | L10 ปุ่มปิดเสียงทำ channel re-subscribe · L15 void reason ไม่ตรงกับ POS | M2 |
| `P-PAY` | Checkout & Payment | `components/checkout/CheckoutScreen.tsx` | 🟢 | ปิด A5 / A6 / L1 แล้ว · เหลือหนี้เชิงโครงสร้าง: เครื่องคิดโปรยังมี 2 ชุด (SQL ของจริง + JS สำหรับแสดงผล) ต้องแก้คู่กันเสมอ | M2 |
| `P-MENU` | Menu Manager | `components/MenuManager.tsx` · `MenuItemModal.tsx` | ⚠️ | L2 Happy Hour ครึ่งใบ · L4 แก้ stock / is_stock_tracked / is_happy_hour ไม่ได้ | M2 |
| `P-STOCK` | Purchase Orders / Stock | `components/IngredientPurchaseManager.tsx` | ⚠️ | L6 แก้ PO = ลบ+insert ไม่ atomic · L16 `price_per_unit` ไม่เคยบันทึก | M2 |
| `P-PROMO` | Promo Manager | `components/PromoManager.tsx` | ⚠️ | L3 ไม่มีช่อง image_url / start_date / end_date ทั้งที่ DB ใช้จริง | M2 |
| `P-REPORT` | Sales History | `components/SalesHistory.tsx` | 🟢 | join ด้วยมือ 4 ขั้น · paginate ใน JS | M2 / M8 |
| `P-CRM` | Loyalty CRM | `components/LoyaltyManager.tsx` | ⚠️ | L7 ปรับแต้มไม่ atomic ไม่มี lock · PK เป็นเบอร์โทร (ปัญหา PDPA) | M2 / M9 |
| `P-DASH` | Owner Dashboard | `components/dashboard/*` | ⚠️ | L12 totalMembers ไม่สนใจช่วงวันที่ · L13 timezone UTC vs local · ~9 round-trip | M2 / M8 |
| `P-EMP` | Employee Manager | `components/EmployeeManager.tsx` · `app/api/employees/*` | 🟢 | — (ปิด A3 แล้ว) | — |
| `P-UI` | Design System | `app/globals.css` · shared components | ⚠️ | `alert()` ปนกับ toast · loading state ไม่เป็นมาตรฐาน · dep ที่ติดตั้งแล้วไม่ใช้ | M2 |

## 1.2 โมดูลฐานราก (Foundation Modules — ผู้ใช้ไม่เห็น แต่ตัดสินว่าขายได้ไหม)

| ID | โมดูล | ขอบเขต | สถานะ | Milestone เจ้าของ |
|---|---|---|:--:|:--:|
| `F-SEC` | Security & RLS | policy ทุกตาราง · grant/revoke · PIN · rate limit | 🟡 | M0 |
| `F-API` | Server Tier | `app/api/*` · service-role · zod · transaction เดียวต่อออเดอร์ | 🟡 | M1 |
| `F-DATA` | Data Integrity & Scale | index · atomic · timezone · migration hygiene · aggregation | ⬜ | M2 / M8 |
| `F-TEST` | Testing & CI | unit · integration (RPC/RLS) · E2E · GitHub Actions | 🟡 | M3 |
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
| **M0** | 🔴 Security Hardening | `F-SEC` `P-PAY` | A1–A7 ปิดครบ · `verify-lockdown.mjs` ผ่านทุกข้อ · ไม่มี mutation ใดที่เชื่อตัวเลขจาก client | 3–4 สัปดาห์ | 🟡 |
| **M1** | 🛡️ Server Tier | `F-API` | ทุก mutation ผ่าน route handler · zod ทุก payload · rate limit ฝั่ง server · 1 ออเดอร์ = 1 transaction | 3–4 สัปดาห์ | 🟡 |
| **M2** | 🔧 Data Integrity & Bug Sweep | `F-DATA` + product modules | L1–L18 ปิดครบ · index H1 ครบ · `supabase db reset` บน DB เปล่าผ่าน · timezone ถูกทุกหน้า | 2–3 สัปดาห์ | ⬜ |
| **M3** | 🧪 Testing Foundation | `F-TEST` | E2E สั่ง→ครัว→เช็คบิลผ่านใน CI · integration test ครอบทุก RPC + RLS · CI บล็อก PR ที่ fail | 2–3 สัปดาห์ | ⬜ |
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
| A7.4 | เปิดบิลซ้ำต่อโต๊ะได้ (ล็อกผิดตาราง) | `S` | ⚠️ | `20260826` เปลี่ยนไปล็อกแถว `tables` ก่อนหาบิล active → คำสั่งพร้อมกันบนโต๊ะเดียวเข้าคิวแล้ว · **เหลือ:** `CREATE UNIQUE INDEX uniq_active_order_per_table ON orders(table_id) WHERE status='active'` ซึ่งต้องเคลียร์บิล active ที่ซ้ำอยู่เดิมก่อน |
| A7.5 | `void_order_item` ตัดสินคืนสต็อกด้วยข้อความไทย | `S` | ⬜ | เปลี่ยนเป็นรหัสเหตุผล (enum) แทนการ match string |
| A7.6 | audit trail ปลอมได้ (`employee_name` จาก client) | `M` | ⬜ | ต้องดึงตัวตนจาก JWT ฝั่ง server |
| A7.7 | `orders.table_id` เป็น `ON DELETE CASCADE` | `S` | ⬜ | ลบโต๊ะ = ลบประวัติการเงินทั้งโต๊ะ → เปลี่ยนเป็น `RESTRICT` |
| A7.8 | env ไม่ตั้งแล้ว fallback เงียบๆ | `S` | ⚠️ | มี `.env.example` แล้ว และ `lib/supabaseAdmin.ts` โยน error เมื่อไม่มีค่า · **เหลือ:** `NEXT_PUBLIC_PROMPTPAY_ID` ยัง fallback `'0899999999'` |
| A7.9 | Realtime broadcast ไม่มี filter | `M` | ⚠️ | หน้าลูกค้าเลิก subscribe แล้ว (เปลี่ยนเป็น polling) · **เหลือ:** ฝั่ง POS ยัง subscribe แบบไม่ filter |
| A7.10 | `test-rpc.mjs` ยิง production | `S` | 🟢 | ลบไฟล์แล้ว (commit `ecb665c`) |

**ปิดแล้ว 11 · เหลือ 5** (A7.4 ⚠️ · A7.5 · A7.6 · A7.7 · A7.8 ⚠️ · A7.9 ⚠️) · **คิวถัดไป A7.7** (FK CASCADE ลบประวัติการเงิน — `S` และอันตรายที่สุดในกลุ่มที่เหลือ) แล้วต่อ A7.5 / A7.6

เกณฑ์ผ่าน M0: ทุกแถวเป็น 🟢 และ `node scripts/verify-lockdown.mjs` ขึ้น "ปิดแล้ว" ครบทุกข้อ

## M1 — 🛡️ Server Tier `🟡 กำลังทำ`

| ID | งาน | สถานะ | หมายเหตุ |
|---|---|:--:|---|
| D1 | Route handlers + service-role client | 🟢 | `app/api/auth/*` · `app/api/customer/*` · `app/api/employees/*` |
| D2 | ย้ายการคำนวณราคา/ยอดเงินทั้งหมดเข้า server | 🟢 | ราคาต่อหน่วย (A4) + ยอดบิล/ส่วนลด/แต้ม (A5) คำนวณใน DB ครบแล้ว |
| D3 | ส่งออเดอร์เป็น transaction เดียว | ⬜ | ตอนนี้ยัง loop RPC ทีละรายการ (= L8) |
| D4 | Idempotency key ตอน checkout | 🟢 | ใช้ `UNIQUE(payments.order_id)` + `FOR UPDATE` เป็นตัวกันซ้ำแทน key จาก client (= A6) — หนึ่งออเดอร์มีได้ใบเดียวเป็น invariant ที่แข็งกว่า |
| D5 | Input validation ด้วย zod ทุก endpoint | ⬜ | ตอนนี้ validate ด้วยมือใน route |
| D6 | Rate limiting ฝั่ง server ที่ปลอม header ไม่ได้ | ⬜ | ต่อยอดจากหางของ A2 |
| D7 | Audit log ผูกกับ identity จาก JWT | ⬜ | = A7.6 |
| D8 | Webhook receiver สำหรับ payment gateway | ⬜ | ของจริงไปโผล่ที่ M8 |

## M2 — 🔧 Data Integrity & Bug Sweep `⬜`

**H1 · Index — ⬜ 0/11 ตัว** (SQL เต็มอยู่ใน `PosRestuarantSass.md` §H1) — ตอนนี้ทั้งสคีมามี index แค่ 2 ตัว hot path ทุกเส้นเป็น sequential scan

**Bug L1–L18 — ⬜ 0/18**

| ID | สรุป | โมดูล | ID | สรุป | โมดูล |
|---|---|---|---|---|---|
| ~~L1~~ | 🟢 ตัดสินแล้ว: `net / 10` (ทำใน A5) | `P-PAY` | L10 | ปุ่มปิดเสียงครัวทำ re-subscribe | `P-KDS` |
| L2 | Happy Hour ครึ่งใบ | `P-MENU` | L11 | preset 3/6 เดือนไม่ render | `P-DASH` |
| L3 | PromoManager ขาด 3 ช่อง | `P-PROMO` | L12 | totalMembers ไม่สนใจช่วงวัน | `P-DASH` |
| L4 | MenuItemModal แก้ stock ไม่ได้ | `P-MENU` | L13 | timezone UTC vs local | `P-DASH` |
| L5 | staff เห็น SalesHistory | `P-FLOOR` | L14 | LAN IP hardcode ใน next.config | config |
| L6 | แก้ PO ไม่ atomic | `P-STOCK` | L15 | void reason ไม่ตรงกัน POS/ครัว | `P-KDS` |
| L7 | ปรับแต้มไม่ atomic | `P-CRM` | L16 | `price_per_unit` ไม่ถูกบันทึก | `P-STOCK` |
| L8 | ส่งออเดอร์เป็น loop | `P-POS` | L17 | `discount_applied` dead column | migration |
| L9 | cart merge ไม่ดูโน้ต | `P-POS` | L18 | `tables.updated_at` ไม่อัปเดต | migration |

**Migration hygiene — ⬜**

- [ ] **มี 3 ไฟล์ ไม่ใช่ 1** ที่เรียงมาก่อน `20260720_promotions.sql` ทั้งที่ต้องใช้ตารางที่ไฟล์นั้นสร้าง — `20260720_payment_promotions.sql` · `20260720_promotion_happy_hour.sql` · `20260720_promotion_menu_item.sql` (พิสูจน์แล้วด้วย `pnpm db:reset` — ตอนนี้ `docker/postgres/init/10-apply-migrations.sh` เลื่อนลำดับให้ชั่วคราว ทางแก้จริงคือเปลี่ยนชื่อไฟล์)
- [ ] ทำทุก migration idempotent (`IF NOT EXISTS` / guard บน `CREATE POLICY`)
- [ ] เอา `EXCEPTION WHEN OTHERS THEN NULL` ออกจาก `20260730_enable_realtime.sql`
- [ ] ตั้ง `REPLICA IDENTITY FULL` เพื่อให้ realtime DELETE/UPDATE ส่งค่าเดิมมาด้วย

## M3 — 🧪 Testing Foundation `⬜`

- [ ] unit: คำนวณโปรโมชั่น · แต้ม · EMVCo payload + CRC
- [x] โครง integration test: `docker-compose.yml` + `supabase/tests/security.sql` (13 assertion ครอบ A1–A6) → `pnpm db:up && pnpm db:test`
- [ ] integration: ขยายให้ครบ **ทุก** RPC + ทุก RLS policy (ตอนนี้ครอบเฉพาะเส้นทางที่ M0 แตะ)
- [ ] E2E (Playwright): สั่ง → ครัว → เช็คบิล · ลูกค้าสแกน QR สั่งเอง
- [ ] CI: lint + typecheck + test + migration check ทุก PR
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
