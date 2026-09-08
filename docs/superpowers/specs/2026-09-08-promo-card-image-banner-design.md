# Design: การ์ดโปรโมชั่นแสดงรูปแบนเนอร์

วันที่: 2026-09-08  
สถานะ: Approved  
Component: `components/promo/PromoManager.tsx`

## เป้าหมาย

แสดง `image_url` ที่อัปโหลดแล้วบนการ์ดรายการโปรโมชั่นในหน้า Owner — ปัจจุบันมีแค่ข้อความและ badge

## แนวทางที่เลือก

**แบนเนอร์เต็มความกว้างด้านบน + badge overlay**

- รูปสูง `h-40` (`160px`), `object-cover`, มุมบนโค้งตามการ์ด
- badge ประเภท + สถานะเปิด/ปิด ทับมุมบนของรูป (`backdrop-blur` + พื้นหลังโปร่ง)
- เนื้อหาเดิม (ชื่อ, เงื่อนไข, ปุ่ม, footer) อยู่ใต้รูป
- ไม่มีรูป: placeholder สีอ่อน + ไอคอน `Tag`
- โปรปิด: `opacity-65 grayscale` ทั้งการ์ดรวมรูป

## นอกขอบเขต

- ไม่แยก `PromoCard` component (scope เล็ก)
- ไม่แก้ upload / schema / หน้าลูกค้า QR (มีรูปอยู่แล้ว)

## ไฟล์ที่แก้

- `components/promo/PromoManager.tsx` — JSX การ์ดใน grid
