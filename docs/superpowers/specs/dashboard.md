# 📊 เอกสารระบบแดชบอร์ดเจ้าของร้าน (Owner Dashboard Specs & Workflow)

> **Yokayaki Izakaya POS — Dashboard Documentation**
> 
> เอกสารฉบับนี้รวบรวม โครงสร้างคอมโพเนนต์, Workflow การทำงาน, Data Queries และ Logic การคำนวณทั้งหมดของระบบ **Owner Dashboard**

---

## 📌 1. ภาพรวมระบบ (System Overview)

หน้า **Owner Dashboard** เป็นศูนย์รวมข้อมูลสถิติ ภาพรวมผลประกอบการ ยอดขาย การใช้โปรโมชั่น พฤติกรรมการชำระเงินของลูกค้า และอันดับสินค้าขายดี เพื่อช่วยให้เจ้าของร้านสามารถวิเคราะห์และตัดสินใจทางธุรกิจได้อย่างแม่นยำ

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Owner Dashboard Architecture                      │
 ├────────────────────────────────────────────────────────────────────────┤
 │ [Header & Refresh Button]                                              │
 │ [DateFilterBar] (วันนี้ | เมื่อวาน | สัปดาห์นี้ | เดือนนี้ | 3 เดือน | 6 เดือน | Custom)│
 ├──────────────────────────────────────┬─────────────────────────────────┤
 │ 🟢 TopKPICards (Net Sales & Profit) │ 🟣 BusinessSpotlight            │
 ├───────────────────┬──────────────────┤    - สัดส่วนวิธีชำระเงิน        │
 │ 📈 SalesChart     │ 🟦 BusinessKPIs  │    - ยอดต้นทุนวัตถุดิบ          │
 │ (กราฟยอดขาย)      │ (สมาชิก/บิล/จาน) │                                 │
 ├───────────────────┴──────────────────┼─────────────────────────────────┤
 │ 🏷️ PromoActivityStream               │ 🍱 TopDishes                    │
 │ (โปรโมชั่นยอดฮิต)                     │ (8 อันดับอาหารขายดี)             │
 └──────────────────────────────────────┴─────────────────────────────────┘
```

---

## 📁 2. สถาปัตยกรรมไฟล์ (Component Architecture)

```
components/dashboard/
├── OwnerDashboard.tsx        # Container หลัก จัดการ State วันที่ และ Layout Grid
├── DateFilterBar.tsx         # แถบเลือกช่วงเวลา (Preset Pickers & Custom Range)
├── TopKPICards.tsx           # การ์ดสรุป ยอดขายสุทธิ และ กำไรประมาณการ
├── BusinessKPIs.tsx          # การ์ดสรุป จำนวนสมาชิก, จำนวนบิล, และ จำนวนจานออเดอร์
├── SalesChart.tsx            # กราฟแท่ง/เส้น แสดงแนวโน้มยอดขายตามช่วงเวลา
├── BusinessSpotlight.tsx     # สัดส่วนวิธีชำระเงิน (เงินสด vs QR/โอน) และยอดต้นทุนวัตถุดิบ
├── PromoActivityStream.tsx   # รายงานสรุปการใช้โปรโมชั่นและส่วนลดที่ถูกใช้จริง
└── TopDishes.tsx             # รายงาน 8 อันดับอาหารขายดีที่สุด
```

---

## 📅 3. ระบบกรองช่วงเวลา (Date Filter Workflow)

ระบบกรองวันที่ดำเนินการผ่าน Custom Hook [`useDateFilter`](file:///c:/Users/PP/Desktop/React/yokayaki/lib/useDateFilter.ts) เพื่อแปลง Preset เป็นช่วงวันที่ `startDate` และ `endDate` (ISO Timestamp):

| Preset Key | คำอธิบายช่วงเวลา |
|------------|------------------|
| `today` | เริ่มต้น 00:00:00 ถึง 23:59:59 ของวันนี้ |
| `yesterday` | เริ่มต้น 00:00:00 ถึง 23:59:59 ของเมื่อวาน |
| `weekly` | 7 วันล่าสุด นับย้อนหลังจากปัจจุบัน |
| `monthly` | 30 วันล่าสุด นับย้อนหลังจากปัจจุบัน |
| `3months` | 90 วันล่าสุด นับย้อนหลังจากปัจจุบัน |
| `6months` | 180 วันล่าสุด นับย้อนหลังจากปัจจุบัน |
| `custom` | ช่วงวันที่ที่ผู้ใช้งานกำหนดเองผ่าน Date Picker |

---

## 💰 4. Logic การคำนวณทางการเงิน (Financial Logic & Calculations)

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                           Financial Calculations                         │
 ├──────────────────────────────────────────────────────────────────────────┤
 │  1. ยอดขายราคาเต็ม (Gross Sales)   = ∑ (payments.subtotal)              │
 │  2. ส่วนลดโปรโมชั่น (Discounts)    = ∑ (payments.discount_amount)        │
 │  3. ยอดขายสุทธิ (Net Sales)         = ∑ (payments.net_amount)            │
 │                                    = Gross Sales - Discounts             │
 │                                    = Total Cash + Total QR/Transfer      │
 │  4. ต้นทุนวัตถุดิบ (Ingredient Cost)= ∑ (item_ingredients.cost)           │
 │  5. กำไรประมาณการ (Net Profit)     = Net Sales - Ingredient Cost         │
 └──────────────────────────────────────────────────────────────────────────┘
```

### 1. ยอดขายสุทธิ (Net Sales)
- **แหล่งข้อมูล**: ตาราง `payments`
- **การคำนวณ**: ผลรวมของ `payments.net_amount` ที่อยู่ในช่วง `startDate` ถึง `endDate`
- **การยืนยันยอดรวม**: ยอดขายสุทธิ ($Net\ Sales$) จะต้องเท่ากับ ยอดเงินสดรวมที่รับจริง ($Total\ Cash$) บวกกับ ยอด QR/โอนรวมที่รับจริง ($Total\ QR$) เสมอ 100%:
  $$\text{Net Sales} = \text{Total Cash} + \text{Total QR/Transfer}$$

---

## ⚙️ 5. รายละเอียดและ Logic ของแต่ละคอมโพเนนต์

### 🟢 5.1 [`TopKPICards.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/dashboard/TopKPICards.tsx) (Net Sales & Estimated Profit)
- **Card 1: ยอดขายสุทธิ (Net Sales)**
  - แสดงตัวเลข `Net Sales` เด่นชัด
  - คำอธิบายย่อย: `(ก่อนหักโปร ฿[Gross Sales] • ส่วนลด ฿[Discounts])`
- **Card 2: กำไรประมาณการ (Estimated Profit)**
  - แสดงตัวเลข `Estimated Profit` เด่นชัด
  - คำอธิบายย่อย: `(ยอดขายสุทธิ ฿[Net Sales] • จัดซื้อ ฿[Ingredient Cost])`

---

### 🟦 5.2 [`BusinessKPIs.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/dashboard/BusinessKPIs.tsx) (Operational KPIs)
- **ลูกค้าสมาชิก**: นับจำนวนแถวทั้งหมดในตาราง `loyalty_members` (`count: 'exact'`)
- **ยอดบิลทั้งหมด**: นับจำนวนธุรกรรมในตาราง `payments` ในช่วงเวลาที่เลือก
- **ยอดออเดอร์ทั้งหมด**: ผลรวม `quantity` จากตาราง `order_items` โดยไม่นับรายการที่ถูก void (`status != 'voided'`)

---

### 📈 5.3 [`SalesChart.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/dashboard/SalesChart.tsx) (Sales Trend Chart)
- ดึงข้อมูลชำระเงินจาก `payments` ตามช่วงเวลา
- จัดกลุ่มยอดขาย (Group By) ตามชั่วโมงหรือวันที่

---

### 🟣 5.4 [`BusinessSpotlight.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/dashboard/BusinessSpotlight.tsx) (Payment Breakdown & Stock Costs)
1. **สัดส่วนวิธีชำระเงิน (Payment Breakdown)**:
   - ดึงข้อมูลยอดเงินสดรวมที่รับจริง (`cashAmount`) และยอด QR/โอนรวมที่รับจริง (`promptpayAmount`) โดยรวมยอดจากทั้งบิลปกติและบิลผสม (`mixed`)
   - **รองรับ Legacy / Null / Split Math Fallback**: คำนวณแจกแจงทุกบิลย้อนหลังอย่างไร้รอยต่อ โดยแปลง `parseFloat(null)` และบิลผสมย้อนหลัง ให้ทุกบาทใน `net_amount` ถูกแบ่งเข้า `cash` หรือ `promptpay` อย่างครบถ้วน ไม่ตกหล่น
   - **สมการการการันตีความถูกต้อง**:
     $$\text{Cash Amount} + \text{QR Amount} \equiv \text{Net Sales (7,065 ฿)}$$
   - คำนวณเปอร์เซ็นต์จากสัดส่วนยอดเงินรวมจริง (`cashPercent` และ `promptpayPercent`)
2. **ยอดต้นทุนวัตถุดิบ (Ingredient Cost Summary)**:
   - สรุปรวมยอดค่าใช้จ่ายการจัดซื้อวัตถุดิบทั้งหมดในช่วงเวลา

---

### 🏷️ 5.5 [`PromoActivityStream.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/dashboard/PromoActivityStream.tsx) (Promotion Analytics)
- ดึงประวัติการใช้โปรโมชั่นจากตาราง `payment_promotions` เชื่อมกับ `promotions`

---

### 🍱 5.6 [`TopDishes.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/dashboard/TopDishes.tsx) (Top 8 Best Sellers)
- ดึงข้อมูลรายการอาหารที่ขายได้จาก `order_items` (ยกเว้น `status = 'voided'`) สรุป 8 อันดับขายดีที่สุด

---

## 🔄 6. การอัปเดตข้อมูล (Refresh Workflow)

- **Manual Refresh**: ผู้ใช้สามารถกดปุ่ม **"รีเฟรชข้อมูล"** ที่มุมขวาบน เพื่อรีเฟรชข้อมูลทันที
- **Automatic Re-fetch**: เมื่อเปลี่ยนช่วงเวลา (Date Filter Preset) จะทำการ Re-fetch ข้อมูลให้อัตโนมัติตาม `startDate` และ `endDate` ใหม่
