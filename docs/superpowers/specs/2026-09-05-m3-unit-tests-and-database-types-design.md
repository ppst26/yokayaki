# Design: M3 — Unit tests (แต้ม + PromptPay) + Database types

วันที่: 2026-09-05  
สถานะ: draft · รอรีวิวก่อนทำ implementation plan  
Milestone: `M3 Testing Foundation` (ปิดรอบนี้)

## ปัญหา

M3 เหลือสองข้อในกระดาน:

1. **unit** — คำนวณโปรโมชั่น · แต้ม · EMVCo payload + CRC
2. **`supabase gen types typescript`** แทน type ที่เขียนมือ

ตอนนี้ไม่มี Vitest/Jest · สูตร PromptPay และแต้มฝังใน `CheckoutScreen.tsx` · client ของ Supabase ยังเป็น `createClient` แบบไม่มี `Database` generic

## เป้าหมาย

- มี unit tests สำหรับ **EMVCo/CRC** และ **สูตรแต้ม** ที่รันใน CI
- มี `lib/database.types.ts` จาก `supabase gen types` และผูกที่ชั้น supabase client หลัก
- ปิดเกณฑ์ M3 ที่เหลือ แล้วอัปเดต `MODULES_MILESTONES.md`

## นอกขอบเขต (รอบนี้ไม่ทำ)

- ดึงเครื่องคิดโปรโมชั่นออกจาก `CheckoutScreen` / unit โปรโมชั่นฝั่ง JS (ของจริงอยู่ที่ SQL + `checkout_promo.sql`)
- รวมสูตร JS กับ SQL ให้เป็นชุดเดียว (dual-engine parity เต็มรูป)
- ไล่แทน `interface` ที่เขียนมือใน UI components ทั้งแอป
- gen types อัตโนมัติใน CI ทุกครั้ง
- เริ่มงาน M4 (multi-tenancy)

## การตัดสินใจที่ล็อกแล้ว

| หัวข้อ | เลือก |
|---|---|
| ขอบเขตรอบนี้ | unit + gen types ในรอบเดียว แล้วปิด M3 |
| ความลึก gen types | สร้าง `lib/database.types.ts` + ผูก client/API หลัก · UI คง type ท้องถิ่นได้ |
| ขอบเขต unit | EMVCo/CRC + สูตรแต้มเท่านั้น (ไม่ดึงโปร) |
| วิธี gen types | `supabase gen types` จาก project ที่ลิงก์ → commit ไฟล์ |

## แนวทางที่เลือก

**Extract helpers เล็ก + Vitest + gen types ผูก client**

1. ย้าย `generatePromptPayQR` / CRC จาก `CheckoutScreen` → `lib/promptPay.ts`
2. สร้าง `lib/loyaltyPoints.ts` สำหรับ `pointsEarnedFromNet` และ `clampPointsRedeem` (ตรงกับสูตรใน `complete_checkout`)
3. เขียน unit ด้วย Vitest · ใส่ `pnpm test:unit` ใน CI
4. รัน `supabase gen types typescript --project-id <REF>` → `lib/database.types.ts`
5. `createClient<Database>(...)` ใน `supabase.ts` · `supabaseAdmin.ts` · `supabaseStaff.ts`

ทางเลือกที่ตัด: เทสต์โดยไม่ extract · unit โปรทั้งก้อน + แทน type UI ทั้งแอป

## Architecture

```
CheckoutScreen ──► lib/promptPay.ts      (EMVCo + CRC16)
               └──► lib/loyaltyPoints.ts (earned + clamp redeem)

lib/database.types.ts  ◄── supabase gen types (commit ใน git)
        │
        ├── lib/supabase.ts
        ├── lib/supabaseAdmin.ts
        └── lib/supabaseStaff.ts

components/*  —— ยังใช้ interface ท้องถิ่นได้
```

- ของจริงโปรโมชั่น / ยอดบิล / แต้มตอนปิดบิล ยังคำนวณใน SQL `complete_checkout`
- helper ฝั่ง JS ใช้แสดงผล / สร้าง QR · unit ล็อกพฤติกรรม preview + CRC ไม่ให้ถอย
- Vitest ไม่พึ่ง Docker หรือ Supabase runtime

## API ของ helpers

### `lib/promptPay.ts`

- `generatePromptPayQR(targetId: string, amount: number): string`
- พฤติกรรมเดิมจาก CheckoutScreen:
  - ตัด non-digit
  - เบอร์ 10 หลักขึ้นต้น `0` → `0066` + ตัดศูนย์นำ
  - tag `02` ถ้ายาว 13 มิฉะนั้น `01`
  - ยอด `amount.toFixed(2)` ใน field 54
  - merchant name คง `YOKAYAKI` ตาม payload เดิม
  - ท้ายด้วย CRC16-CCITT (poly `0x1021`, init `0xffff`) 4 ตัว hex ตัวใหญ่

### `lib/loyaltyPoints.ts`

- `pointsEarnedFromNet(net: number): number` → `Math.floor(net / 10)` (อัตราเดียวกับ A5 / L1)
- `clampPointsRedeem(requested, memberPts, amountAfterPromo): number` →  
  `Math.max(0, Math.min(requested, memberPts, Math.floor(amountAfterPromo)))`  
  เทียบเคียง `LEAST(p_points_redeem, v_member_pts, FLOOR(r_subtotal - r_promo_disc))` ใน SQL

`CheckoutScreen` เรียก helpers เหล่านี้แทนโค้ดในไฟล์ · clamp ใช้ตอนตั้ง/แสดงแต้มที่ขอใช้ถ้าจุดนั้นมีอยู่แล้ว หรือ export ให้พร้อมใช้แม้ UI ยังส่งค่าดิบไป API (ของจริงยัง clamp ใน DB)

## Unit tests

| ไฟล์ | เคสขั้นต่ำ |
|---|---|
| `lib/promptPay.test.ts` | เบอร์ 10 หลักแปลง `0066…` · เลข 13 ไม่แปลง · มี `5303764` / `5802TH` · CRC 4 hex ท้าย · field 54 จาก `toFixed(2)` |
| `lib/loyaltyPoints.test.ts` | earned: 99→9, 100→10, 0→0 · clamp ไม่เกินแต้มสมาชิก / ยอดหลังโปร / ค่าที่ขอ · ไม่ติดลบ |

## Database types

- ไฟล์: `lib/database.types.ts` (generated · commit)
- คำสั่ง (บันทึกใน `package.json` เป็น `db:types`):

```bash
supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > lib/database.types.ts
```

- `SUPABASE_PROJECT_ID` จาก dashboard / URL — ไม่ commit secret
- ถ้า CLI หรือสิทธิ์ไม่พร้อมตอน implement → **หยุดแล้วแจ้ง** ห้ามเขียน types มือแทนเงียบ ๆ
- CI **ไม่** gen ใหม่ทุกครั้ง — ใช้ไฟล์ใน git + `tsc` / build

### จุดที่ผูก `Database`

- `lib/supabase.ts`
- `lib/supabaseAdmin.ts` (รวม Proxy ที่ห่อ client)
- `lib/supabaseStaff.ts` (`requireStaffSupabase`)

API routes ที่ได้ type ผ่าน client ที่ typed แล้วโดยอ้อม · ไม่บังคับไล่ annotate ทุก handler ในรอบนี้

## Tooling / CI

| รายการ | รายละเอียด |
|---|---|
| Vitest | `devDependency` |
| scripts | `test:unit` · `db:types` |
| CI | ใน job `lint-typecheck-build` เพิ่ม `pnpm test:unit` หลัง install (ก่อนหรือหลัง lint ก็ได้ ขอให้ fail บล็อก merge) |

## Exit criteria (ปิด M3)

1. `pnpm test:unit` ผ่านตามเคสด้านบน
2. CI รัน unit ใน job lint/build
3. มี `lib/database.types.ts` จาก gen types และ commit แล้ว
4. `createClient<Database>` ใน client ทั้งสามไฟล์
5. `pnpm typecheck` / `pnpm build` ผ่าน
6. อัปเดต `MODULES_MILESTONES.md`: ติ๊ก unit + gen types · M3 → 🟢 · ขยับ “Milestone ปัจจุบัน” ไป M4 (งาน M4 ยังไม่เริ่ม)

## ความเสี่ยงที่รับได้

- preview โปรใน UI ยังไม่ถูก unit ครอบ (พึ่ง SQL)
- type ท้องถิ่นใน UI อาจคลาดจาก `Database` จนกว่าจะไล่ทีหลัง
- payload PromptPay ยัง hardcode ชื่อร้าน `YOKAYAKI` — ไม่ refactor ในรอบนี้

## อ้างอิง

- `MODULES_MILESTONES.md` § M3
- `components/checkout/CheckoutScreen.tsx` (สูตรเดิม)
- `supabase/migrations/20260827_checkout_server_side.sql` (แต้มใน DB)
- `supabase/tests/checkout_promo.sql` (integration โปร / ปิดบิล)
