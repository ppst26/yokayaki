# Design Spec: Promotion Creation & Edit Modal Redesign

**Date:** 2026-08-08  
**Component:** `components/promo/PromoManager.tsx`  
**Status:** Approved by User  

---

## 🎯 Objective
Redesign the promotion creation/edit modal in `PromoManager.tsx` to provide a highly intuitive, modern, and rich UX. Replace generic select dropdowns with a **3-column card grid selector** and render dynamic form fields based on the selected promotion category.

---

## 📐 Layout & Interaction Specifications

### 1. Header & Type Selector (Grid-3 Card Selector)
Top section of the modal contains a 3-column button selector (`grid grid-cols-3 gap-2.5`):

1. 🏷️ **ส่วนลด (Discount)**
   - Icon: `TicketPercent`
   - Description: ส่วนลด % หรือ บาท (สั่งทั้งร้านหรือเฉพาะเมนู)
2. 🎟️ **คูปอง (Coupon Code)**
   - Icon: `Tag`
   - Description: รหัสคูปองส่วนลดสำหรับลูกค้ากรอก
3. 🎁 **ซื้อ - แถม (Buy X Get Y)**
   - Icon: `Gift`
   - Description: ซื้อเมนูที่กำหนดครบ X แถม Y ฟรี

---

### 2. Dynamic Form Fields by Category

#### 2.1 Category: ส่วนลด (Discount)
- **ชื่อโปรโมชั่น (Promo Name):** Input text (e.g. "ส่วนลด 20% ต้อนรับลูกค้าใหม่")
- **รูปแบบส่วนลด (Discount Unit):** Segmented Control / Radio (`% เปอร์เซ็นต์` vs `จำนวนเงิน (บาท)`)
  - If `%`: Input number (`discount_percent`), min 1, max 100
  - If `บาท`: Input number (`discount_amount`), min 1
- **ยอดสั่งซื้อขั้นต่ำ (Min Order):** Input number (`min_order_amount`)
- **เมนูที่ร่วมรายการ (Target Menu):** Dropdown select from `menuItems` ("ทุกเมนูในร้าน (ทั้งบิล)" หรือเลือกเมนูเฉพาะ)
- **สวิตช์เปิด/ปิด Happy Hour (กำหนดช่วงเวลา):**
  - If enabled: Render Time inputs (`start_time` - `end_time`, e.g., `14:00` - `17:00`)

---

#### 2.2 Category: คูปอง (Coupon Code)
- **ชื่อโปรโมชั่น (Promo Name):** Input text (e.g. "คูปองส่วนลด 50 บาท")
- **รหัสคูปอง (Coupon Code):** Input text uppercase font-mono (e.g. `YOKA50`), auto-capitalized
- **รูปแบบส่วนลด (Discount Unit):** Segmented Control (`% เปอร์เซ็นต์` vs `จำนวนเงิน (บาท)`)
- **มูลค่าส่วนลด:** Input number (`discount_percent` หรือ `discount_amount`)
- **ยอดสั่งซื้อขั้นต่ำ (Min Order):** Input number (`min_order_amount`)
- **เมนูที่ร่วมรายการ:** Dropdown select from `menuItems` (optional)

---

#### 2.3 Category: ซื้อ - แถม (Buy X Get Y)
- **ชื่อโปรโมชั่น (Promo Name):** Input text (e.g. "ยากิโทริ ซื้อ 2 แถม 1")
- **เลือกเมนูที่จัดโปรโมชั่น (Target Menu):** Dropdown select from `menuItems` (Required)
- **เงื่อนไขจำนวน (Quantity Rules):** `grid grid-cols-2 gap-3`
  - จำนวนซื้อ (X): Input number (`buy_qty`), default 1
  - จำนวนแถม (Y): Input number (`free_qty`), default 1
- **สวิตช์เปิด/ปิด Happy Hour (กำหนดช่วงเวลา):**
  - If enabled: Render Time inputs (`start_time` - `end_time`)

---

## 💾 State & Data Mapping

| UI Field | State Variable | DB Column |
|---|---|---|
| Promo Category | `type` (`'percentage' \| 'fixed' \| 'buy_x_get_y'`) | `promotions.type` |
| Promo Name | `name` | `promotions.name` |
| Coupon Code | `couponCode` | `promotions.coupon_code` |
| Discount Percent | `discountPercent` | `promotions.discount_percent` |
| Discount Amount | `discountAmount` | `promotions.discount_amount` |
| Min Order | `minOrderAmount` | `promotions.min_order_amount` |
| Buy Qty | `buyQty` | `promotions.buy_qty` |
| Free Qty | `freeQty` | `promotions.free_qty` |
| Target Menu | `menuItemId` | `promotions.menu_item_id` |
| Happy Hour Toggle | `isHappyHour` (boolean) | Computed from `start_time` / `end_time` |
| Start / End Time | `startTime`, `endTime` | `promotions.start_time`, `promotions.end_time` |

---

## ✅ Verification Plan
1. Test creating a **Percentage Discount** promotion with & without Happy Hour time and target menu.
2. Test creating a **Fixed Coupon Code** promotion (confirm code is converted to uppercase and displayed correctly).
3. Test creating a **Buy X Get Y** promotion with target menu selection.
4. Verify Editing existing promotions populates all dynamic fields correctly.
5. Verify TypeScript compilation (`npx tsc --noEmit`).
