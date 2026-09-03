# Design: อัปโหลดรูปเมนู/โปรโมชั่น ขึ้น Cloudflare R2

วันที่: 2026-09-03  
สถานะ: รอรีวิวจากเจ้าของก่อนลงมือ implement

## ปัญหา

ตอนนี้ `MenuItemModal` และฟอร์มโปรโมชั่นรับแค่การวาง `image_url` เป็นข้อความ (เช่น Unsplash) — เจ้าของร้านต้องหา URL เอง ไม่สะดวก และไม่มีที่เก็บรูปของร้านเอง

## เป้าหมาย

- อัปโหลดรูปจากเครื่องขึ้น **Cloudflare R2** ได้ทั้งเมนูและโปรโมชั่น
- ใช้ **คอมโพเนนต์อัปโหลดร่วมกัน**
- เก็บ public URL ลงคอลัมน์ `image_url` เดิม — หน้า POS / ลูกค้า QR ไม่ต้องเปลี่ยนวิธีแสดงผล
- ลบไฟล์เก่าบน R2 ทันทีเมื่อบันทึกแล้วรูปเปลี่ยนหรือถูกลบ
- ไม่ให้ R2 credentials หลุดไป client bundle (คง trust boundary เดิม)

## นอกขอบเขต (รอบนี้ไม่ทำ)

- Cloudflare Images / image transform / resize อัตโนมัติ
- ช่องวาง URL ภายนอก
- GC job เก็บ orphan จากไฟล์ที่อัปแล้วแต่ยังไม่กดบันทึก
- เปลี่ยน schema (`image_url` ยังเป็น `TEXT` ของ public URL)
- อัปโหลดชนิดไฟล์อื่นนอกจากรูป

## แนวทางที่เลือก

**Presigned PUT + เก็บ public URL ใน `image_url`**

1. Owner ขอ presigned URL จาก server
2. Browser `PUT` ไฟล์ขึ้น R2 โดยตรง (ไม่ผ่าน Next.js)
3. ใส่ `publicUrl` ลงฟอร์ม → บันทึกเมนู/โปรเหมือนเดิม
4. หลังบันทึกสำเร็จ ถ้ามี URL เก่าที่เป็นของ R2 เราและต่างจากของใหม่ → ลบ object เก่า

ทางเลือกที่ตัดออก: เก็บแค่ object key ใน DB (ต้องแตะทุกจุดอ่านรูป) · proxy อัปผ่าน Next API (กิน bandwidth Vercel)

## Architecture

### Trust boundary

| ชั้น | สิทธิ์ |
|---|---|
| Server (`app/api/uploads/*`) | ถือ R2 access key · ออก presign · ลบ object |
| Owner (JWT `emp_role=owner`) | เรียก presign / delete ได้เท่านั้น |
| Staff / ลูกค้า | อ่าน `image_url` สาธารณะเหมือนเดิม — ไม่แตะ R2 API |

### Data flow

```
[ImageUploadField]
    │ POST /api/uploads/presign { contentType, contentLength, folder }
    ▼
[requireOwner + lib/r2.presignPut]
    │ { uploadUrl, publicUrl, key }
    ▼
[Browser PUT → R2] ──CORS──► bucket
    │
    ▼ set image_url = publicUrl ในฟอร์ม
[บันทึกเมนู / โปร ตามเดิม]
    │ ถ้า previousImageUrl เป็นของเรา และ ≠ URL ใหม่
    ▼ POST /api/uploads/delete { url }
[lib/r2.deleteObject]
```

### Object key

รูปแบบ: `{folder}/{uuid}.{ext}`  
- `folder` ∈ `menu` | `promo`  
- `ext` จาก MIME ที่อนุญาตเท่านั้น (`jpg` / `png` / `webp`)

### Public URL

`{R2_PUBLIC_BASE_URL}/{key}`  
เก็บทั้งสตริงนี้ลง `image_url`

## UI

### คอมโพเนนต์ร่วม

`components/ui/ImageUploadField.tsx`

Props:
- `value: string | null` — public URL ปัจจุบัน
- `onChange: (url: string | null) => void`
- `folder: 'menu' | 'promo'`
- `disabled?: boolean`

เลย์เอาต์ที่เลือก (**B · Preview + ปุ่ม**):
- ซ้าย: thumbnail 88×88 (ว่าง = placeholder «ไม่มีรูป»)
- ขวา: ป้ายสถานะ + ปุ่ม «เลือกไฟล์» / «เปลี่ยนรูป» + ปุ่ม «ลบรูป»
- ข้อความช่วย: `JPG / PNG / WebP · สูงสุด 2 MB`

ใช้แทนช่อง URL ใน:
- `components/menu/MenuItemModal.tsx`
- `components/promo/PromoManager.tsx` (ฟอร์มสร้าง/แก้ไขโปร)

### ข้อจำกัดไฟล์ (ตรวจทั้ง client และ server)

- MIME: `image/jpeg` · `image/png` · `image/webp`
- ขนาดสูงสุด: **2 MB**
- รูปไม่บังคับ (ว่างได้)

### สถานะ UI

| สถานะ | แสดง |
|---|---|
| ว่าง | placeholder + «เลือกไฟล์» |
| กำลังอัป | spinner บน thumbnail |
| สำเร็จ | preview + «อัปโหลดแล้ว» |
| error | ข้อความไทยสั้นใต้ปุ่ม |

## API

### `POST /api/uploads/presign`

- Auth: `requireOwner()`
- Body: `{ contentType: string, contentLength: number, folder: 'menu' | 'promo' }`
- ตรวจ MIME + ขนาด ≤ 2 MB
- คืน: `{ uploadUrl, publicUrl, key }`
- Presign อายุประมาณ **60 วินาที** · method PUT · บังคับ `Content-Type` ให้ตรงที่ขอ

### `POST /api/uploads/delete`

- Auth: `requireOwner()`
- Body: `{ url: string }`
- ลบได้เฉพาะ URL ที่ขึ้นต้นด้วย `R2_PUBLIC_BASE_URL` เท่านั้น — นอกนั้นตอบ `400`
- ใช้หลังบันทึกเมนู/โปรสำเร็จ เมื่อรูปเปลี่ยนหรือถูกลบ

### Server helper

`lib/r2.ts` (`import 'server-only'`)
- S3-compatible client ชี้ R2 endpoint
- `presignPut({ key, contentType, contentLength })`
- `deleteObject(key)`
- `isOurPublicUrl(url)` / `publicUrlToKey(url)`

ไม่ import จาก Client Component

## การลบไฟล์เก่า

1. ตอนเปิดฟอร์มแก้ไข จำ `previousImageUrl = image_url` เดิม
2. ผู้ใช้อัปรูปใหม่หรือกดลบรูป → เปลี่ยนค่าในฟอร์มเท่านั้น (ยังไม่ลบ R2)
3. บันทึกเมนู/โปรสำเร็จแล้ว
4. ถ้า `previousImageUrl` เป็นของเรา และ ≠ URL ใหม่ (รวมกรณีใหม่เป็น `null`) → เรียก delete
5. ถ้าลบ R2 ล้มหลังบันทึก DB สำเร็จ → **ไม่ rollback** แถว DB · log ไว้ · ยอม orphan

ไฟล์ที่อัปแล้วแต่ยังไม่กดบันทึก = orphan ได้ชั่วคราว — ไม่มี GC ในรอบนี้

## ตั้งค่า Cloudflare R2 (มี account แล้ว)

1. สร้าง bucket เช่น `yokayaki-media`
2. สร้าง API token (Object Read & Write) → ได้ Access Key ID / Secret
3. เปิดอ่านสาธารณะผ่าน **custom domain** หรือ `*.r2.dev` แล้วใส่เป็น `R2_PUBLIC_BASE_URL`
4. ตั้ง CORS บน bucket: อนุญาต `PUT` (และ `GET` ถ้าจำเป็น) จาก origin ของ POS (`http://localhost:3000` + production)

### Environment variables

เพิ่มใน `.env.example` และตั้งบน Vercel / `.env.local`:

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=yokayaki-media
R2_PUBLIC_BASE_URL=https://media.example.com
```

ห้ามขึ้นต้นด้วย `NEXT_PUBLIC_` — เป็น server-only ทั้งหมด

## Error handling

| จุด | พฤติกรรม |
|---|---|
| ไม่มี session / ไม่ใช่ owner | `401` / `403` |
| MIME หรือขนาดผิด | `400` จาก presign · UI แสดงข้อความไทย |
| Presign หมดอายุ / PUT ล้ม | UI ให้เลือกไฟล์ใหม่ |
| ลบ URL ที่ไม่ใช่ของเรา | `400` ไม่เรียก R2 |
| บันทึก DB สำเร็จ แต่ลบไฟล์เก่าล้ม | ไม่ rollback · log · รูปใหม่ใช้ได้ |

## Testing

- **Unit:** ตรวจ MIME/ขนาด · `isOurPublicUrl` · แปลง URL→key · สร้าง key ตาม folder
- **Manual / E2E เบา:** owner อัปรูปเมนู → เห็นใน MenuGrid และหน้าลูกค้า · เปลี่ยนรูปแล้ว object เก่าหาย · กดลบรูปแล้วบันทึก → `image_url` เป็น null และไฟล์หายจาก R2 · staff เรียก presign ไม่ได้
- **ไม่ใส่ใน `pnpm db:test`** — เป็นชั้น API/UI ไม่ใช่ SQL

## ไฟล์หลักที่จะแตะตอน implement

| ไฟล์ | บทบาท |
|---|---|
| `lib/r2.ts` | ใหม่ — R2 client + helpers |
| `app/api/uploads/presign/route.ts` | ใหม่ |
| `app/api/uploads/delete/route.ts` | ใหม่ |
| `components/ui/ImageUploadField.tsx` | ใหม่ — คอมโพเนนต์ร่วม |
| `components/menu/MenuItemModal.tsx` | แทนช่อง URL |
| `components/promo/PromoManager.tsx` | แทนช่อง URL |
| `.env.example` | เอกสาร env |
| unit tests ที่เกี่ยวข้อง | ตามส่วน Testing |

ไม่ต้องมี migration SQL — คอลัมน์ `image_url` มีอยู่แล้ว

## ความสำเร็จเมื่อ

1. Owner เลือกไฟล์จาก Modal เมนู/โปร แล้วรูปขึ้น R2 และแสดงใน POS + หน้าลูกค้า
2. ไม่มีช่องวาง URL ใน UI แล้ว
3. เปลี่ยนหรือลบรูปแล้วบันทึก → object เก่าบน R2 หาย
4. Staff / anon / ลูกค้าเรียก presign หรือ delete ไม่ได้
5. R2 secrets ไม่อยู่ใน client bundle
