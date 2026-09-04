# M3 Unit Tests + Database Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปิด M3 ด้วย Vitest สำหรับ PromptPay/แต้ม helpers และ `lib/database.types.ts` จาก `supabase gen types` ที่ผูกกับ supabase clients หลัก

**Architecture:** ดึงสูตรออกจาก `CheckoutScreen` เป็น `lib/promptPay.ts` + `lib/loyaltyPoints.ts` แล้วเทสต์ด้วย Vitest ใน CI · gen `Database` types จาก Supabase project แล้วใส่ generic ให้ `createClient` ใน `supabase.ts` / `supabaseAdmin.ts` / `supabaseStaff.ts` · UI type ท้องถิ่นไม่ต้องไล่แทนทั้งแอป

**Tech Stack:** Vitest, TypeScript, Next.js 16, `@supabase/supabase-js`, Supabase CLI (`gen types`)

**Spec:** `docs/superpowers/specs/2026-09-05-m3-unit-tests-and-database-types-design.md`

## Global Constraints

- Unit ครอบแค่ EMVCo/CRC + สูตรแต้ม — **ห้าม** ดึงเครื่องคิดโปรออกจาก `CheckoutScreen`
- `lib/database.types.ts` ต้องมาจาก `supabase gen types` — ถ้า CLI/สิทธิ์ไม่พร้อม **หยุดแล้วแจ้ง** ห้ามเขียน types มือแทนเงียบ ๆ
- ผูก `Database` ที่ client หลักเท่านั้น · UI คง interface ท้องถิ่นได้
- CI ไม่ gen types ทุกครั้ง — commit ไฟล์ใน git
- ใช้ `pnpm` เท่านั้น (ห้าม npm/yarn)
- อย่า commit `.env.local` หรือ secrets

## File map

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/promptPay.ts` | `generatePromptPayQR` + CRC |
| `lib/loyaltyPoints.ts` | `pointsEarnedFromNet` · `clampPointsRedeem` |
| `lib/promptPay.test.ts` | unit PromptPay |
| `lib/loyaltyPoints.test.ts` | unit แต้ม |
| `vitest.config.ts` | alias `@/` + รวม `lib/**/*.test.ts` |
| `lib/database.types.ts` | generated Database types |
| `components/checkout/CheckoutScreen.tsx` | import helpers |
| `components/checkout/CRMMemberCard.tsx` | ใช้ `clampPointsRedeem` / `amountAfterPromo` |
| `lib/supabase.ts` · `supabaseAdmin.ts` · `supabaseStaff.ts` | `createClient<Database>` |
| `package.json` | vitest · scripts `test:unit` · `db:types` |
| `.env.example` | `SUPABASE_PROJECT_ID=` |
| `.github/workflows/ci.yml` | รัน `pnpm test:unit` |
| `MODULES_MILESTONES.md` | ปิด M3 |

---

### Task 1: Vitest + `loyaltyPoints` (TDD)

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/loyaltyPoints.ts`
- Create: `lib/loyaltyPoints.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `pointsEarnedFromNet(net: number): number`
  - `clampPointsRedeem(requested: number, memberPts: number, amountAfterPromo: number): number`

- [ ] **Step 1: ติดตั้ง Vitest + config**

```bash
pnpm add -D vitest
```

สร้าง `vitest.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

ใน `package.json` เพิ่ม scripts:

```json
"test:unit": "vitest run",
"test:unit:watch": "vitest"
```

- [ ] **Step 2: เขียน failing tests**

สร้าง `lib/loyaltyPoints.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { clampPointsRedeem, pointsEarnedFromNet } from '@/lib/loyaltyPoints';

describe('pointsEarnedFromNet', () => {
  it('floors net / 10', () => {
    expect(pointsEarnedFromNet(0)).toBe(0);
    expect(pointsEarnedFromNet(99)).toBe(9);
    expect(pointsEarnedFromNet(100)).toBe(10);
    expect(pointsEarnedFromNet(109)).toBe(10);
  });
});

describe('clampPointsRedeem', () => {
  it('ไม่เกินแต้มสมาชิก / ยอดหลังโปร / ค่าที่ขอ', () => {
    expect(clampPointsRedeem(50, 30, 100)).toBe(30);
    expect(clampPointsRedeem(50, 80, 40)).toBe(40);
    expect(clampPointsRedeem(20, 80, 100)).toBe(20);
  });

  it('ไม่ติดลบและ floor ยอดหลังโปร', () => {
    expect(clampPointsRedeem(-5, 10, 10)).toBe(0);
    expect(clampPointsRedeem(10, 10, 9.9)).toBe(9);
  });
});
```

- [ ] **Step 3: รันเทสต์ให้ล้ม**

```bash
pnpm test:unit
```

Expected: FAIL — ไม่พบ `@/lib/loyaltyPoints` หรือ export

- [ ] **Step 4: implement `lib/loyaltyPoints.ts`**

```ts
/** แต้มที่ได้จากยอดสุทธิ — อัตราเดียวกับ complete_checkout (net / 10) */
export function pointsEarnedFromNet(net: number): number {
  return Math.floor(Math.max(0, net) / 10);
}

/**
 * clamp แต้มที่ขอใช้ — เทียบเคียง
 * LEAST(p_points_redeem, v_member_pts, FLOOR(r_subtotal - r_promo_disc))
 */
export function clampPointsRedeem(
  requested: number,
  memberPts: number,
  amountAfterPromo: number
): number {
  return Math.max(
    0,
    Math.min(
      Math.floor(requested),
      Math.floor(memberPts),
      Math.floor(amountAfterPromo)
    )
  );
}
```

- [ ] **Step 5: รันเทสต์ให้ผ่าน**

```bash
pnpm test:unit
```

Expected: PASS ทั้ง `loyaltyPoints` (PromptPay ยังไม่มีก็ได้ถ้ายังไม่สร้างไฟล์เทสต์)

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts lib/loyaltyPoints.ts lib/loyaltyPoints.test.ts
git commit -m "$(cat <<'EOF'
test(loyalty): add Vitest and points earn/clamp helpers

Lock preview formulas to match complete_checkout net/10 and LEAST redeem clamp.
EOF
)"
```

---

### Task 2: `promptPay` helper (TDD)

**Files:**
- Create: `lib/promptPay.ts`
- Create: `lib/promptPay.test.ts`

**Interfaces:**
- Produces: `generatePromptPayQR(targetId: string, amount: number): string`
- Consumes: none from Task 1

- [ ] **Step 1: เขียน failing tests**

สร้าง `lib/promptPay.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generatePromptPayQR } from '@/lib/promptPay';

describe('generatePromptPayQR', () => {
  it('แปลงเบอร์ 10 หลักขึ้นต้น 0 เป็น 0066… และมี CRC คงที่', () => {
    const payload = generatePromptPayQR('0812345678', 100);
    expect(payload).toBe(
      '00020101021229370016A0000006770101110213006681234567853037645406100.005802TH5908YOKAYAKI630429B5'
    );
    expect(payload.slice(-4)).toMatch(/^[0-9A-F]{4}$/);
  });

  it('เลข 13 หลักไม่ใส่ 0066', () => {
    const payload = generatePromptPayQR('1234567890123', 12.5);
    expect(payload).toBe(
      '00020101021229370016A000000677010111021312345678901235303764540512.505802TH5908YOKAYAKI6304B94F'
    );
    expect(payload.includes('0066')).toBe(false);
  });

  it('มี currency THB และ country TH', () => {
    const payload = generatePromptPayQR('0812345678', 1);
    expect(payload).toContain('5303764');
    expect(payload).toContain('5802TH');
    expect(payload).toContain('5908YOKAYAKI');
  });
});
```

- [ ] **Step 2: รันให้ล้ม**

```bash
pnpm test:unit lib/promptPay.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: implement `lib/promptPay.ts`**

ย้าย logic จาก `components/checkout/CheckoutScreen.tsx` (ฟังก์ชัน `generatePromptPayQR` เดิม) มาเป็น export:

```ts
export function generatePromptPayQR(targetId: string, amount: number): string {
  let target = targetId.replace(/[^0-9]/g, '');
  if (target.length === 10 && target.startsWith('0')) {
    target = '0066' + target.substring(1);
  }
  const targetTag = target.length === 13 ? '02' : '01';
  const subField04 = `0016A000000677010111${targetTag}${target.length.toString().padStart(2, '0')}${target}`;
  const field29 = `29${subField04.length.toString().padStart(2, '0')}${subField04}`;
  const amtStr = amount.toFixed(2);
  const field54 = `54${amtStr.length.toString().padStart(2, '0')}${amtStr}`;

  const raw = `000201010212${field29}5303764${field54}5802TH5908YOKAYAKI6304`;

  function crc16Hex(str: string): string {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
        else crc = (crc << 1) & 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  return raw + crc16Hex(raw);
}
```

- [ ] **Step 4: รันให้ผ่าน**

```bash
pnpm test:unit
```

Expected: PASS ทุกไฟล์ใน `lib/**/*.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/promptPay.ts lib/promptPay.test.ts
git commit -m "$(cat <<'EOF'
test(promptpay): extract EMVCo payload helper with CRC unit tests

Keep merchant name and CRC algorithm identical to CheckoutScreen preview QR.
EOF
)"
```

---

### Task 3: ต่อ helpers เข้า Checkout UI

**Files:**
- Modify: `components/checkout/CheckoutScreen.tsx`
- Modify: `components/checkout/CRMMemberCard.tsx`

**Interfaces:**
- Consumes: `generatePromptPayQR`, `pointsEarnedFromNet`, `clampPointsRedeem`
- Produces: UI ใช้สูตรเดียวกันกับ unit · clamp ที่ input ใช้ `amountAfterPromo = subtotal - promoDiscount`

- [ ] **Step 1: อัปเดต `CRMMemberCard`**

เปลี่ยน prop `subtotal` → `amountAfterPromo: number` (หรือเก็บชื่อ `subtotal` แต่ส่งค่าหลังหักโปร — **แนะนำเปลี่ยนชื่อ** ให้ชัด):

ใน `components/checkout/CRMMemberCard.tsx`:

```ts
import { clampPointsRedeem } from '@/lib/loyaltyPoints';

// props:
amountAfterPromo: number;

// ใน input:
max={Math.min(member.points, Math.floor(amountAfterPromo))}
onChange={e =>
  setPointsToRedeem(
    clampPointsRedeem(Number(e.target.value) || 0, member.points, amountAfterPromo)
  )
}
```

ลบการใช้ `subtotal` ตรง ๆ ใน clamp

- [ ] **Step 2: อัปเดต `CheckoutScreen`**

1. ลบฟังก์ชัน `generatePromptPayQR` ในไฟล์
2. เพิ่ม imports:

```ts
import { generatePromptPayQR } from '@/lib/promptPay';
import { pointsEarnedFromNet } from '@/lib/loyaltyPoints';
```

3. แทนที่:

```ts
const pointsEarned = Math.floor(netAmount / 10);
```

ด้วย:

```ts
const pointsEarned = pointsEarnedFromNet(netAmount);
```

4. ส่งเข้า `CRMMemberCard`:

```ts
amountAfterPromo={Math.max(0, subtotal - promoDiscount)}
```

(ลบ prop `subtotal={subtotal}` ถ้าเปลี่ยนชื่อแล้ว)

- [ ] **Step 3: ตรวจ typecheck เบา ๆ**

```bash
pnpm test:unit && pnpm typecheck
```

Expected: unit PASS · typecheck ไม่มี error จาก checkout

- [ ] **Step 4: Commit**

```bash
git add components/checkout/CheckoutScreen.tsx components/checkout/CRMMemberCard.tsx
git commit -m "$(cat <<'EOF'
refactor(checkout): use shared PromptPay and loyalty point helpers

Align redeem clamp preview with amount after promo like complete_checkout.
EOF
)"
```

---

### Task 4: CI รัน unit tests

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: script `pnpm test:unit` จาก Task 1
- Produces: job `lint-typecheck-build` ล้มถ้า unit ล้ม

- [ ] **Step 1: เพิ่ม step ใน CI**

ใน job `lint-typecheck-build` หลัง `Install dependencies` และก่อนหรือหลัง `Lint`:

```yaml
      - name: Unit tests
        run: pnpm test:unit
```

- [ ] **Step 2: ยืนยัน local**

```bash
pnpm test:unit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
ci: run Vitest unit suite on lint/build job

Block merges when PromptPay or loyalty point helpers regress.
EOF
)"
```

---

### Task 5: Gen `database.types.ts` + ผูก clients

**Files:**
- Create: `lib/database.types.ts`
- Modify: `lib/supabase.ts`
- Modify: `lib/supabaseAdmin.ts`
- Modify: `lib/supabaseStaff.ts`
- Modify: `package.json` (`db:types`)
- Modify: `.env.example`

**Interfaces:**
- Produces: `export type Database = { ... }` จาก CLI
- Clients: `createClient<Database>(...)`

- [ ] **Step 1: เพิ่ม env + script**

ใน `.env.example`:

```dotenv
# ใช้กับ pnpm db:types (ref จาก hostname ของ NEXT_PUBLIC_SUPABASE_URL)
SUPABASE_PROJECT_ID=
```

ใน `package.json`:

```json
"db:types": "supabase gen types typescript --project-id \"$SUPABASE_PROJECT_ID\" --schema public > lib/database.types.ts"
```

บน Windows Git Bash / ถ้า `$VAR` ไม่ขยายใน pnpm script ให้ใช้:

```json
"db:types": "node -e \"require('child_process').execSync('npx supabase gen types typescript --project-id '+process.env.SUPABASE_PROJECT_ID+' --schema public',{stdio:['inherit','pipe','inherit']}).stdout\" > lib/database.types.ts"
```

หรือรันคำสั่งเต็มใน Step 2 โดยตรงแล้วเก็บ script แบบง่ายที่อ่าน env จาก shell:

```json
"db:types": "supabase gen types typescript --project-id ${SUPABASE_PROJECT_ID} --schema public > lib/database.types.ts"
```

(ผู้รันต้องมี `SUPABASE_PROJECT_ID` ใน environment หรือ `.env.local` ที่ export ก่อนรัน)

- [ ] **Step 2: Gen types**

ดึง project ref จาก `NEXT_PUBLIC_SUPABASE_URL` (hostname ก่อน `.supabase.co`) แล้ว:

```bash
# ติดตั้ง CLI ชั่วคราวถ้ายังไม่มี
pnpm dlx supabase --version

export SUPABASE_PROJECT_ID="<ref-จาก-url>"
# อาจต้อง login: pnpm dlx supabase login
pnpm dlx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > lib/database.types.ts
```

ตรวจว่าไฟล์ขึ้นต้นคล้าย:

```ts
export type Json = ...
export type Database = {
  public: {
    Tables: { ... }
    ...
  }
}
```

ถ้า login/สิทธิ์ล้มเหลว → **หยุดงานนี้แล้วรายงานผู้ใช้** อย่าเขียน types มือ

- [ ] **Step 3: ผูก `Database` กับ clients**

`lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
// ...
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => getStaffToken(),
});
```

`lib/supabaseAdmin.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

let client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  // ... เดิม แต่
  client = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  // get trap เดิม
});
```

`lib/supabaseStaff.ts`:

```ts
import type { Database } from '@/lib/database.types';

export async function requireStaffSupabase(): Promise<SupabaseClient<Database>> {
  // ...
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 4: typecheck + build**

```bash
pnpm typecheck
pnpm build
```

Expected: ผ่าน (ถ้า error จาก typed `.from()` ที่เคยใช้คอลัมน์ผิด — แก้เฉพาะจุดที่พังจาก generic ใหม่ ห้ามปิด type ทั้งโปรเจกต์)

Env สำหรับ build ถ้าจำเป็นใช้ค่า placeholder แบบ CI

- [ ] **Step 5: Commit**

```bash
git add lib/database.types.ts lib/supabase.ts lib/supabaseAdmin.ts lib/supabaseStaff.ts package.json .env.example
git commit -m "$(cat <<'EOF'
feat(db): add generated Database types to supabase clients

Wire createClient<Database> for staff, admin, and browser clients; keep UI local interfaces.
EOF
)"
```

---

### Task 6: ปิด M3 ในกระดาน + ตรวจ exit criteria

**Files:**
- Modify: `MODULES_MILESTONES.md`
- Modify: `docs/superpowers/specs/2026-09-05-m3-unit-tests-and-database-types-design.md` (สถานะ → implemented)

**Interfaces:** none

- [ ] **Step 1: อัปเดต `MODULES_MILESTONES.md`**

- หัวไฟล์: `Last Updated: 2026-09-05` · `Milestone ปัจจุบัน: M4 Multi-Tenancy` (ยัง ⛔ จนกว่าจะเริ่ม)
- ในตาราง §2: M3 สถานะ → 🟢
- `F-TEST` → 🟢 (หมายเหตุสั้น: unit PromptPay/แต้ม + gen types)
- ใน § M3:
  - `[x] unit: ...` พร้อมหลักฐาน (`lib/promptPay.test.ts` · `lib/loyaltyPoints.test.ts` · CI)
  - `[x] supabase gen types ...` → `lib/database.types.ts`
- หมายเหตุชัดว่า M3 เลือก unit เฉพาะแต้ม+EMVCo (โปรยังพึ่ง SQL) ตาม spec

- [ ] **Step 2: อัปเดตสถานะ spec**

เปลี่ยนบรรทัดสถานะเป็น: `implemented`

- [ ] **Step 3: รันชุดยืนยันสุดท้าย**

```bash
pnpm test:unit
pnpm typecheck
pnpm lint
```

Expected: ทั้งหมดผ่าน

- [ ] **Step 4: Commit**

```bash
git add MODULES_MILESTONES.md docs/superpowers/specs/2026-09-05-m3-unit-tests-and-database-types-design.md
git commit -m "$(cat <<'EOF'
docs: close M3 testing foundation on the milestone board

Record unit suite and generated Database types as exit evidence.
EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Extract PromptPay + CRC + unit | Task 2 |
| points earned + clamp + unit | Task 1 |
| Wire CheckoutScreen / CRM clamp after promo | Task 3 |
| Vitest + `test:unit` in CI | Task 1 + 4 |
| `supabase gen types` → `lib/database.types.ts` | Task 5 |
| `createClient<Database>` สามไฟล์ | Task 5 |
| ไม่ดึงเครื่องคิดโปร / ไม่ไล่ UI types ทั้งแอป | Global Constraints + ไม่มี task |
| ปิด M3 ใน MODULES_MILESTONES | Task 6 |
| หยุดถ้า gen types ไม่ได้ | Task 5 Step 2 |

ไม่มี TBD / “similar to Task N” ที่ไม่ขยายโค้ด
