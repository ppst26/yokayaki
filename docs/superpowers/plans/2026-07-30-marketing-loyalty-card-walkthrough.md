# Marketing & Loyalty Insights Card — Walkthrough

> **วันที่:** 2026-07-30  
> **สถานะ:** 🟢 เสร็จสมบูรณ์ (Completed)  

---

## 🎯 สรุปสิ่งที่พัฒนา (Summary of Accomplishments)

ได้ปรับปรุงการ์ดในหน้า **Owner Dashboard ([OwnerDashboard.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/OwnerDashboard.tsx))** โดยเปลี่ยนการ์ด Member Insights เดิม (Card 2) เป็น **"การ์ดวิเคราะห์การตลาด & โปรโมชั่น" (Marketing & Loyalty Insights Card)** แบบ **Hybrid Card ที่มี Badge Tabs สลับโหมดได้** ตามข้อกำหนดใน Spec:

### 1. 🏷️ แท็บโปรโมชั่นยอดฮิต (Top Promotions Tab)
- ดึงข้อมูลจริงจากตาราง `payment_promotions` ตามช่วงเวลาที่เลือกใน Date Filter
- แสดงอันดับ 1-5 ของโปรโมชั่นที่มีการใช้มากที่สุด พร้อม Badge ระบุประเภทโปรโมชั่น (`% ส่วนลด`, `ลดคงที่`, `แถมสินค้า`)
- แสดงจำนวนบิลที่ใช้ และยอดส่วนลดรวมที่ให้ออกไป (-X ฿)
- มีสรุปภาพรวมส่วนลดโปรโมชั่นรวมด้านล่างของการ์ด

### 2. 👑 แท็บพฤติกรรมสมาชิก & แต้ม (Loyalty & Points Tab)
- แสดงแถบเปรียบเทียบ visual revenue bar สัดส่วนยอดขายสมาชิก (👑 Amber) vs ลูกค้าทั่วไป (👤 Sky)
- แสดงยอดซื้อเฉลี่ยต่อบิลของสมาชิกเทียบกับลูกค้าทั่วไป
- **ไฮไลต์มูลค่าส่วนลดจากการใช้แต้มสะสมเงินบาทรวม (`-X ฿`)** พร้อมคำนวณสัดส่วน % เทียบกับส่วนลดการตลาดรวม

---

## 🧪 ผลการทดสอบ (Validation Results)

- **Build Check:** ผ่าน `pnpm build` สำเร็จ 100% ไม่มีข้อผิดพลาดของ TypeScript หรือ Lint
- **Date Filter Integration:** ตัวกรองวัน (วันนี้ / สัปดาห์นี้ / เดือนนี้) สามารถอัปเดตข้อมูลของทั้ง 2 แท็บได้เรียลไทม์
- **Responsive Layout:** แสดงผลสวยงามทั้งบน Desktop และ Mobile

---

## 📜 Commit Logs

1. `feat(dashboard): add promotion data fetching and aggregation state` ([4c57b90](file:///c:/Users/PP/Desktop/React/yokayaki/components/OwnerDashboard.tsx))
2. `feat(dashboard): implement hybrid marketing & loyalty insights card with tabs` ([81dd9e4](file:///c:/Users/PP/Desktop/React/yokayaki/components/OwnerDashboard.tsx))
