# Design: ปรับปรุงประสิทธิภาพการโหลดรูปภาพเมนู (Menu Image Loading & Caching Optimization)

วันที่: 2026-09-15  
สถานะ: Proposed  
ผู้จัดทำ: แพร (AI Agent) ร่วมกับ พีพี  

---

## 1. ปัญหาและสาเหตุ (Problem Statement & Root Causes)

เมื่อลูกค้าสแกน QR Code ที่โต๊ะแล้วเปิดหน้าสั่งอาหารบนมือถือ (`/customer/[session_id]`) พบว่ารูปภาพอาหารโหลดช้าอย่างเห็นได้ชัด จากการตรวจสอบโค้ดพบ 4 ปัจจัยหลัก:

1. **ขนาดไฟล์รูปภาพต้นฉบับใหญ่เกินไป (No Compression on Upload):**
   - เจ้าของร้านอัปโหลดรูปผ่าน [`ImageUploadField.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/ui/ImageUploadField.tsx) ซึ่งอนุญาตไฟล์สูงสุดถึง 2 MB โดยไม่มีการย่อขนาด (Resize) หรือบีบอัด (Compress) รูปก่อนส่งขึ้น Cloudflare R2
   - รูปถ่ายความละเอียดสูงจากกล้องมือถือ (เช่น 2000×2000px ขึ้นไป) มีขนาด 1–2 MB ในขณะที่หน้าจอมือถือของลูกค้าแสดงผลรูปในการ์ดเมนูขนาดจริงเพียง ~160×160px (หรือ 320×320px บนจอ Retina)
   - หากหมวดหมู่มี 20 รายการ มือถือลูกค้าต้องดาวน์โหลดข้อมูลรูปสูงถึง 20–40 MB ผ่านเน็ตมือถือ
2. **ขาดการทำ Lazy Loading (`loading="lazy"`):**
   - ใน [`app/customer/[session_id]/page.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/app/customer/[session_id]/page.tsx) ใช้แท็ก `<img>` ดิบโดยไม่มี `loading="lazy"` และ `decoding="async"`
   - เบราว์เซอร์พยายามดาวน์โหลดรูปภาพทั้งหมดในหมวดหมู่พร้อมกันทันที ส่งผลให้เกิด Network Congestion แย่งแบนด์วิดท์กันเอง
3. **ขาด HTTP Cache-Control Header สำหรับรูปบน R2:**
   - ใน [`lib/r2.ts`](file:///c:/Users/PP/Desktop/React/yokayaki/lib/r2.ts) ตอนสร้าง Presigned PUT ไม่ได้กำหนด `CacheControl` ทำให้รูปที่ส่งไป R2 ไม่มี Header สำหรับสั่งให้เบราว์เซอร์หรือ CDN แคชไฟล์ไว้อย่างถาวร
4. **ไม่มี Preloading และ Skeleton Placeholder:**
   - ระหว่างที่รูปรอโหลด ผู้ใช้เห็นเพียงกล่องสีเทาว่างเปล่า ไม่มีการทำ Shimmer Animation ทำให้รู้สึกว่าระบบค้าง และไม่มีการ Preload รูปภาพดักไว้ล่วงหน้าระหว่างที่ลูกค้ายังอยู่หน้า Home

---

## 2. เป้าหมาย (Goals)

1. **ขนาดไฟล์รูปภาพลดลง 90–95%:** รูปที่อัปโหลดใหม่ถูกย่อขนาดและแปลงเป็น WebP อัตโนมัติ (ขนาดไม่เกิน 640×640 px, ไฟล์เหลือ ~30–70 KB)
2. **เปิดหน้าเมนูแล้วรูปแรก ๆ ติดทันที:** ใช้ Lazy Loading โหลดเฉพาะรูปที่มองเห็น และ Preload รูปเมนูหมวดแรกขณะลูกค้าอ่านหน้า Home
3. **ประสบการณ์ใช้งานลื่นไหล (Smooth UX):** มี Skeleton Shimmer ขณะโหลด และรูปค่อย ๆ Fade-in เข้ามา ไม่กระตุก
4. **Instant Load เมื่อเปิดซ้ำ:** กำหนด `Cache-Control: public, max-age=31536000, immutable` บน R2 ให้เบราว์เซอร์และ CDN จำรูปถาวร
5. **ไม่เพิ่มภาระ JS Bundle:** ใช้ Native Web APIs (HTML5 Canvas) ในการบีบอัดรูป โดยไม่ต้องติดตั้ง Library ภายนอกขนาดใหญ่

---

## 3. สถาปัตยกรรมและการทำงาน (Architecture & Technical Details)

```
[ เจ้าของร้าน / แอดมิน ]
        │
        ▼ เลือกรูปถ่าย (รองรับไฟล์ต้นฉบับถึง 10 MB)
[ compressImage() ฝั่ง Client ]
        │ ➔ HTML5 Canvas ย่อขนาด max 640px, aspect-ratio เดิม
        │ ➔ แปลงเป็น image/webp, quality 0.82
        │ ➔ ขนาดไฟล์เหลือ ~30–70 KB
        ▼
[ POST /api/uploads/presign ]
        │ ➔ ขอ URL อัปโหลด R2 พร้อมกำหนด Cache-Control
        ▼
[ PUT ไปยัง Cloudflare R2 ]
        │ ➔ บันทึกไฟล์ WebP พร้อม Header แคช 1 ปี
        ▼
[ Cloudflare R2 Bucket / Public CDN ]
        ▲
        │
        ├── [ ลูกค้าเปิดหน้า Home ] ➔ Preload รูป 4-6 เมนูแรกของหมวดหมู่อันดับ 1 ในเบื้องหลัง
        │
        └── [ ลูกค้าเปิดหน้าสั่งอาหาร (Order) ]
                ├── รูปในจอ ➔ แสดงผลทันที (หรือ Shimmer Skeleton แล้ว Fade-in)
                └── รูปนอกจอ ➔ โหลดแบบ Lazy เมื่อเลื่อนหน้าจอลงมา
```

---

## 4. รายละเอียดการแก้ไขรายไฟล์ (Detailed File Changes)

### 4.1 Client-side Image Compression Utility
- **สร้างไฟล์ใหม่:** `lib/imageCompression.ts`
  - ฟังก์ชัน `compressImage(file: File, options?: { maxWidth?: number; maxHeight?: number; quality?: number }): Promise<File>`
  - ตรวจสอบชนิดไฟล์: หากเป็น `image/jpeg`, `image/png`, `image/webp` จะนำเข้า Canvas ผ่าน `createImageBitmap` หรือ `HTMLImageElement`
  - คำนวณขนาดใหม่: ด้านยาวสุดไม่เกิน 640px (รักษาอัตราส่วน)
  - วาดลง Offscreen / Canvas และแปลงเป็น Blob `image/webp` ที่คุณภาพ 0.82
  - คืนค่าเป็น `File` วัตถุใหม่ เพื่อส่งต่อให้ฟังก์ชันอัปโหลด

### 4.2 การอัปเดตระบบอัปโหลดรูปภาพ ([`ImageUploadField.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/ui/ImageUploadField.tsx) & [`uploadLimits.ts`](file:///c:/Users/PP/Desktop/React/yokayaki/lib/uploadLimits.ts))
- ขยายเพดานไฟล์ต้นฉบับที่รับจากผู้ใช้เป็น **10 MB** (ช่วยให้ถ่ายรูปสดจากมือถือแล้วเลือกรูปได้ทันที)
- ปรับปรุง `handleFileChange`:
  - ก่อนส่งไป presign ให้เรียก `compressImage(file)`
  - ได้ไฟล์ WebP ขนาดเล็ก (~40–70 KB) จากนั้นนำไปขอ presign ด้วย `contentType: 'image/webp'`
- คงการตรวจสอบความปลอดภัยฝั่ง Server ที่ 2 MB (ไฟล์ที่บีบอัดแล้วจะเล็กกว่า 2 MB เสมอ)

### 4.3 การตั้งค่า Caching บน Cloudflare R2 ([`lib/r2.ts`](file:///c:/Users/PP/Desktop/React/yokayaki/lib/r2.ts))
- ในคำสั่ง `PutObjectCommand`:
  - เพิ่ม `CacheControl: 'public, max-age=31536000, immutable'`
  - กำหนด `signableHeaders` ให้รวม `cache-control` หรือส่งใน metadata ให้สอดคล้องกับ client PUT

### 4.4 คอมโพเนนต์แสดงรูปภาพพร้อม Skeleton ([`CustomerImage.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/customer/CustomerImage.tsx))
- สร้างคอมโพเนนต์ร่วมสำหรับรูปเมนูและโปรโมชั่น:
  - รองรับ Props: `src`, `alt`, `className`, `fallbackIcon`
  - State: `isLoading = true`, `hasError = false`
  - ใส่ `loading="lazy"` และ `decoding="async"`
  - แสดง Shimmer Skeleton สี `neutral-800 animate-pulse` ขณะกำลังดาวน์โหลด
  - เมื่อ `onLoad` สำเร็จ ให้ Transition Opacity จาก 0 เป็น 1 (250ms)
  - เมื่อ `onError` แสดง Fallback Icon (`UtensilsCrossed`) สวยงาม

### 4.5 Preload รูปภาพล่วงหน้าในหน้าลูกค้า ([`app/customer/[session_id]/page.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/app/customer/[session_id]/page.tsx))
- เมื่อ `activeTab === 'home'` และดึงข้อมูล `menuItems` สำเร็จ:
  - ใช้ `requestIdleCallback` หรือ `setTimeout` เล็กน้อย เพื่อ Preload รูป 6 เมนูแรกของหมวดแรกผ่าน `new Image().src = url`
  - เมื่อลูกค้ากดปุ่ม "เริ่มเลือกสั่งอาหาร" รูปจะอยู่ใน Memory Cache ของเบราว์เซอร์แล้ว แสดงผลได้ทันที

### 4.6 ปรับปรุง POS Order Screen ([`components/order/MenuGrid.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/order/MenuGrid.tsx))
- ใส่ `loading="lazy"` และ `decoding="async"` ใน `MenuGrid` ฝั่ง POS ด้วย เพื่อให้หน้าจอพนักงานหน้าร้านโหลดรูปได้เร็วขึ้นเช่นเดียวกัน

---

## 5. แผนการทดสอบและการตรวจสอบ (Verification Plan)

1. **Unit Tests (`lib/imageCompression.test.ts`):**
   - ทดสอบการย่อขนาดภาพตาม Aspect Ratio
   - ทดสอบผลลัพธ์ว่าคืนค่าเป็นฟอร์แมต WebP และขนาดเล็กลงจริง
2. **การทดสอบการอัปโหลดรูป:**
   - ทดสอบเลือกรูปความละเอียดสูง (เช่น 4–8 MB) ในหน้าจัดการเมนู
   - ยืนยันว่ารูปถูกแปลงเป็น WebP ขนาดจิ๋ว (~40–70 KB) ก่อนขึ้น R2
   - ตรวจสอบว่ารูปแสดงผลในหน้า POS และหน้าลูกค้าได้ถูกต้อง
3. **การทดสอบหน้าลูกค้า (`/customer/[session_id]`):**
   - เปิดหน้าสั่งอาหารบน Mobile Emulation ใน Chrome DevTools ด้วยโหมด Network Throttling "Fast 4G / Slow 4G"
   - ตรวจสอบว่ามี Skeleton Shimmer แสดงอย่างสวยงาม ไม่เห็นกล่องเปล่า
   - ตรวจสอบว่ารูปเมนูแถวบนสุดแสดงผลอย่างรวดเร็ว และรูปด้านล่างค่อย ๆ ทยอยโหลดเมื่อเลื่อนหน้าจอ
   - ตรวจสอบ Network Tab: ตรวจพบ `loading="lazy"` ทำงานถูกต้อง และ Header มี `Cache-Control: immutable`
4. **ความเข้ากันได้ของระบบ (Regression):**
   - ตรวจสอบว่าคำสั่ง `pnpm typecheck` และ `pnpm test:unit` ผ่าน 100%
