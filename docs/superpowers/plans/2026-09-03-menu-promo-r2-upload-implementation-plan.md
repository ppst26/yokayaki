# Menu/Promo R2 Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มฟีเจอร์อัปโหลดรูปเมนูและโปรโมชั่นขึ้น Cloudflare R2 ด้วย Presigned PUT แล้วเก็บ `publicUrl` ลง `image_url` (เดิม) พร้อมลบ object เก่าบน R2 เมื่อรูปเปลี่ยน/ถูกลบ

**Architecture:** เพิ่ม trust boundary ใหม่ที่ `app/api/uploads/*` ใช้ `requireOwner()` เท่านั้นในการออก presign และลบ object บน R2. ฝั่ง UI ใช้คอมโพเนนต์ร่วม `components/ui/ImageUploadField.tsx` (เลย์เอาต์ B) เพื่ออัปโหลด/preview และส่งกลับเฉพาะ `publicUrl` ไปเก็บใน DB ผ่าน flow เดิมของ `MenuManager`/`PromoManager`

**Tech Stack:** Next.js App Router, TypeScript, TailwindCSS, `zod`, Cloudflare R2 (S3-compatible) ผ่าน AWS SDK v3 + Presigned PUT

## Global Constraints
- ห้ามทำให้ R2 secrets โผล่ใน client bundle (ห้าม import `server-only` จาก client)
- UI ต้องไม่มีช่องวาง URL ภายนอก (ใช้ upload อย่างเดียว)
- ตรวจชนิดไฟล์ + ขนาดทั้ง client และ server (MIME: `image/jpeg`/`image/png`/`image/webp`, สูงสุด `2MB`)
- เก็บสตริง `publicUrl` ลง `menu_items.image_url` และ `promotions.image_url`
- หลังบันทึกเมนู/โปรสำเร็จ: ถ้า `previousImageUrl` เป็นของเราและต่างจากค่ารูปใหม่ ให้ลบ object เก่าด้วย API (DB ไม่ rollback หากลบ R2 ล้ม)
- API routes ต้องล็อกอินเป็น owner เท่านั้นด้วย `requireOwner()`

---

### Task 1: เพิ่ม R2 server helper + presign/delete API routes

**Files:**
- Create: `lib/r2.ts`
- Modify: `lib/api/schemas.ts`
- Create: `app/api/uploads/presign/route.ts`
- Create: `app/api/uploads/delete/route.ts`
- Modify: `.env.example`
- Modify: `package.json` (เพิ่ม deps)

**Interfaces:**
- `POST /api/uploads/presign` → `{ uploadUrl: string, publicUrl: string, key: string }`
- `POST /api/uploads/delete` → `{ ok: true }`

- [ ] Step 1: เพิ่ม dependencies

Run:
```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] Step 2: เพิ่ม env vars

เพิ่มใน `.env.example`:
```dotenv
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

- [ ] Step 3: เพิ่ม Zod schemas

เพิ่มใน `lib/api/schemas.ts`:
```ts
export const r2UploadFolderSchema = z.enum(['menu', 'promo']);

export const r2PresignBodySchema = z.object({
  folder: r2UploadFolderSchema,
  contentType: z.string().min(1),
  contentLength: z.number().int().positive(),
});

export const r2DeleteBodySchema = z.object({
  url: z.string().min(1),
});
```

- [ ] Step 4: สร้าง `lib/r2.ts` (server-only)

ต้องมีฟังก์ชันอย่างน้อย:
```ts
export type R2Folder = 'menu' | 'promo';

export function isOurPublicUrl(url: string): boolean;
export function publicUrlToKey(url: string): string | null;

export async function presignPut(params: {
  folder: R2Folder;
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }>;

export async function deleteObjectByUrl(publicUrl: string): Promise<{ ok: true }>;
```

การกันลบผิด bucket:
- `isOurPublicUrl()` ตรวจว่า `url` ขึ้นต้นด้วย `R2_PUBLIC_BASE_URL`
- `publicUrlToKey()` คืน key จากการ strip prefix

- [ ] Step 5: สร้าง route `app/api/uploads/presign/route.ts`

โครงหลัก:
- `requireOwner()`
- `parseJsonBody(request, r2PresignBodySchema)`
- validate MIME/size <= 2MB (whitelist)
- สร้าง key รูปแบบ: `${folder}/${crypto.randomUUID()}.${ext}`
- เรียก `presignPut()` และคืน JSON

- [ ] Step 6: สร้าง route `app/api/uploads/delete/route.ts`

โครงหลัก:
- `requireOwner()`
- `parseJsonBody(request, r2DeleteBodySchema)`
- เช็ค `isOurPublicUrl(url)` ถ้าไม่ใช่ → `400`
- เรียก `deleteObjectByUrl(url)` และคืน `{ ok: true }`

- [ ] Step 7: Verify

Run:
```bash
pnpm lint
pnpm typecheck
pnpm build
```

---

### Task 2: สร้างคอมโพเนนต์ร่วม `ImageUploadField` (เลย์เอาต์ B)

**Files:**
- Create: `components/ui/ImageUploadField.tsx`

**Interfaces:**
```ts
type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: 'menu' | 'promo';
  disabled?: boolean;
};
```

- [ ] Step 1: UI/UX
  - thumbnail ซ้าย 88×88, แสดง preview เมื่อ `value` ไม่เป็น null
  - ปุ่ม “เลือก/เปลี่ยนไฟล์” ใช้ file input hidden
  - ปุ่ม “ลบรูป” → เรียก `onChange(null)`
  - แสดง error ใต้ปุ่มเมื่อ MIME/ขนาดไม่ผ่าน

- [ ] Step 2: Presign + PUT
  - ตรวจ MIME whitelist และ `file.size <= 2 * 1024 * 1024`
  - `POST /api/uploads/presign` ส่ง `{ folder, contentType, contentLength }`
  - `PUT` ไปที่ `uploadUrl` พร้อม header `Content-Type: file.type`
  - เมื่อสำเร็จ → `onChange(publicUrl)`

- [ ] Step 3: Verify (local)
  - Owner เปิดหน้า Menu/Promo แล้วอัปโหลดรูปได้
  - staff/ไม่ล็อกอิน → presign/delete ต้องไม่สำเร็จ (403/401)

---

### Task 3: Integrate กับเมนู (`MenuManager` + `MenuItemModal`) และลบ object เก่า

**Files:**
- Modify: `components/menu/MenuItemModal.tsx`
- Modify: `components/menu/MenuManager.tsx`

- [ ] Step 1: เปลี่ยน input ใน `MenuItemModal`
  - ลบ `<input type="url" ...>` สำหรับ `image_url`
  - ใส่ `ImageUploadField folder="menu" value={formData.image_url ?? null} onChange={...}`

- [ ] Step 2: เพิ่ม state เก็บ `previousImageUrl` ใน `MenuManager`
  - `openAddModal()` → `previousImageUrl = null`
  - `openEditModal(item)` → `previousImageUrl = item.image_url ?? null`

- [ ] Step 3: หลัง insert/update สำเร็จ → ลบ R2 object เก่า (ถ้าต้องลบ)
  - `nextUrl = payload.image_url` (string|null)
  - ถ้า `previousImageUrl` และ `previousImageUrl !== nextUrl` → `POST /api/uploads/delete` โดยส่ง `{ url: previousImageUrl }`
  - ถ้า delete fail → ไม่ rollback DB (แสดง message error แบบ “ลบรูปเก่าล้มเหลว แต่บันทึกเมนูสำเร็จ” หรือ log เฉยๆ)

- [ ] Step 4: หลังลบเมนู (handleDelete)
  - หลังลบ row สำเร็จ → ถ้า `deleteTarget.image_url` ไม่ว่าง → เรียก delete route

---

### Task 4: Integrate กับโปรโมชั่น (`PromoManager`) และลบ object เก่า

**Files:**
- Modify: `components/promo/PromoManager.tsx`

- [ ] Step 1: แทนช่อง URL ด้วย `ImageUploadField folder="promo"`
  - เปลี่ยน state `imageUrl` จาก string เป็น `string | null` เพื่อสื่อความหมาย “ไม่มีรูป”
  - `openAdd` → `imageUrl = null`, `previousImageUrl = null`
  - `openEdit(p)` → `imageUrl = p.image_url ?? null`, `previousImageUrl = p.image_url ?? null`

- [ ] Step 2: หลัง insert/update สำเร็จ → ลบ R2 object เก่า (ถ้าต้องลบ)
  - `nextUrl = payload.image_url` (string|null)
  - ถ้า `previousImageUrl` และต่างจาก `nextUrl` → เรียก delete route

- [ ] Step 3: handleDelete (ลบโปรโมชั่น)
  - หลัง supabase delete สำเร็จ → ถ้า `deleteTarget.image_url` เป็นของเรา → เรียก delete route

---

### Task 5: Verification + rollout

- [ ] Step 1: Manual verification
  - Owner อัปโหลดเมนู → เมนูขึ้นรูปในตาราง + หน้าลูกค้า QR
  - แก้ไขเมนูด้วยรูปใหม่ → object เก่าหายจาก R2
  - ลบรูปในฟอร์ม (ให้ null) แล้วบันทึก → DB `image_url = null` และไฟล์หาย
  - สร้าง/แก้ไข/ลบโปรโมชั่น → behavior เหมือนเมนู

- [ ] Step 2: Build checks

Run:
```bash
pnpm lint
pnpm typecheck
pnpm build
```

- [ ] Step 3: (ถ้ามี) smoke test แบบ e2e เพิ่มเฉพาะขั้นตอน upload (ไม่บังคับเมื่อ R2 env ยังไม่พร้อม)

---

## Self-Review (ทำก่อนเริ่มโค้ด)
1. Spec coverage: presign/delete, UI B, integration menu+promo, delete old object, owner-only trust boundary
2. Placeholder scan: ไม่มีคำว่า TBD/implement later ใน plan
3. Type consistency: `image_url` กลายเป็น `string | null` ใน state ที่อัปโหลดและ payload
4. Scope check: ไม่เปลี่ยน schema และไม่ใส่ช่อง URL ภายนอก

---

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-09-03-menu-promo-r2-upload-implementation-plan.md`.

เลือกวิธีรัน:
1. Subagent-Driven (recommended) — จะแบ่งงานเป็นหลายขั้นและรีวิวคั่น
2. Inline Execution — ทำในเทิร์นนี้โดยทำงานตาม checklist

คุณอยากให้เลือกแบบไหน?

