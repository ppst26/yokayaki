# 🎨 YOKAYAKI POS — Design System & Style Guidelines

เอกสารนี้สรุปมาตรฐานการออกแบบ (Design System) ของระบบ **YOKAYAKI POS** โดยอ้างอิงจากภาพดีไซน์จริงทั้งใน **Light Theme** และ **Dark Theme** เน้นดีไซน์สไตล์ Modern Flat Clean Card (ไม่มี Border ไม่มี Shadow) พร้อมรายละเอียดรหัสสีของปุ่มและตัวเลขทุกประเภท

---

## 📌 1. Card Style Specification (หลักการออกแบบ Card)

แนวคิดหลักในการออกแบบ Card คือ **"Flat & Seamless Elevation"**
- **No Border**: ไม่ใส่เส้นขอบ (`border-none` / `border-0`)
- **No Shadow**: ไม่ใส่เงา drop shadow (`shadow-none`)
- **Visual Contrast**: อาศัยความแตกต่างระหว่าง **Page Background** และ **Card Surface Color** ในการแบ่งระดับสายตาและความเป็นสัดส่วน
- **Border Radius**: มุมโค้งมนระดับ `16px` (`rounded-2xl`) สำหรับ Card หลัก และ `12px` (`rounded-xl`) สำหรับ Tag / Badge / Input

```tsx
// โครงสร้าง Tailwind CSS ของ Card หลัก (ไม่มี Border ไม่มี Shadow)
<div className="rounded-2xl border-none shadow-none bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-5">
  {/* Card Content */}
</div>
```

---

## 🎨 2. Color Palette Matrix (ตารางกำหนดสี Light & Dark Theme)

### 2.1 Theme Surface & Background Colors

| Elements / Layer | Light Theme (โหมดสว่าง) | Dark Theme (โหมดมืด) | Tailwind Classes |
| :--- | :--- | :--- | :--- |
| **Page Background** (พื้นหลังเว็บหลัก) | `#F4F4F5` (Zinc 100) / `#F8FAFC` | `#09090B` (Zinc 950) | `bg-zinc-100 dark:bg-zinc-950` |
| **Sidebar Background** (แถบเมนูด้านข้าง) | `#FFFFFF` (Pure White) | `#09090B` (Zinc 950) | `bg-white dark:bg-zinc-950` |
| **Card Surface** (แผ่น Card / Table Container) | `#FFFFFF` (Pure White) | `#18181B` (Zinc 900) | `bg-white dark:bg-zinc-900` |
| **Inner Card / Sub-surface** (ชิปข้อมูล/แถบรอง) | `#F4F4F5` (Zinc 100) | `#27272A` (Zinc 800) | `bg-zinc-100 dark:bg-zinc-800` |
| **Input / Search Box Bg** (ช่องค้นหา) | `#F4F4F5` (Zinc 100) | `#18181B` (Zinc 900) | `bg-zinc-100 dark:bg-zinc-900` |
| **Table Header Bg** (หัวตาราง) | `#18181B` (Zinc 900) | `#18181B` (Zinc 900) | `bg-zinc-900 dark:bg-zinc-900` |
| **Table Row Hover** (เมื่อชี้แถวตาราง) | `#F8FAFC` (Slate 50) | `#27272A/50` (Zinc 800/50) | `hover:bg-zinc-50 dark:hover:bg-zinc-800/50` |

---

### 2.2 Typography & Text Colors

| Text Level | Light Theme | Dark Theme | Tailwind Classes |
| :--- | :--- | :--- | :--- |
| **Primary Text** (หัวข้อ / ข้อความหลัก) | `#09090B` (Zinc 950) | `#FAFAFA` (Zinc 50) / `#FFFFFF` | `text-zinc-900 dark:text-zinc-50` |
| **Secondary / Muted Text** (คำอธิบาย / ป้ายรอง) | `#71717A` (Zinc 500) | `#A1A1AA` (Zinc 400) | `text-zinc-500 dark:text-zinc-400` |
| **Disabled / Subtle Text** | `#A1A1AA` (Zinc 400) | `#52525B` (Zinc 600) | `text-zinc-400 dark:text-zinc-600` |
| **Primary Button Text** | `#FFFFFF` (Pure White) | `#FFFFFF` (Pure White) | `text-white` |

---

## 🔘 3. Button Color Specifications (การกำหนดสีปุ่มทุกรูปแบบ)

### 3.1 Primary Action Button (ปุ่มการทำงานหลัก เช่น "+ เพิ่มเมนูอาหารใหม่")
- **Default State**: Background `#DC2626` / `#E11D48` (`bg-red-600`), Text `#FFFFFF` (`text-white font-medium`)
- **Hover State**: Background `#B91C1C` (`hover:bg-red-700`)
- **Active State**: Background `#991B1B` (`active:bg-red-800`)
- **Shape**: `rounded-full` (ทรงแคปซูล) หรือ `rounded-xl` (มุมโค้งมน 12px)

---

### 3.2 Category Filter Buttons (ปุ่มเลือกหมวดหมู่แท็บ)

| State | Background Color | Text Color | Tailwind Classes |
| :--- | :--- | :--- | :--- |
| **Active Category** (เลือกอยู่) | `#DC2626` (`bg-red-600`) | `#FFFFFF` (`text-white`) | `bg-red-600 text-white rounded-full font-medium` |
| **Inactive Category (Light)** | `#FFFFFF` (`bg-white`) / `#F4F4F5` | `#3F3F46` (`text-zinc-700`) | `bg-white hover:bg-zinc-100 text-zinc-700 rounded-full` |
| **Inactive Category (Dark)** | `#18181B` (`bg-zinc-900`) / `#27272A` | `#A1A1AA` (`text-zinc-400`) | `bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-full` |

---

### 3.3 Table Action Icon Buttons (ปุ่มไอคอนจัดการในตาราง)

| Button Type | Light Theme | Dark Theme | Icon Color | Tailwind Classes |
| :--- | :--- | :--- | :--- | :--- |
| **Edit Button (แก้ไข)** | `#F4F4F5` (`bg-zinc-100`) | `#27272A` (`bg-zinc-800`) | `#3F3F46` / `#D4D4D8` | `p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:opacity-80` |
| **Delete Button (ลบ)** | `#FEE2E2` (`bg-red-100/80`) | `#3F1D24` (`bg-red-950/50`) | `#EF4444` (`text-red-500`) | `p-2 rounded-full bg-red-100 dark:bg-red-950/50 text-red-500 hover:opacity-80` |
| **Refresh Button (รีเฟรช)** | `#F4F4F5` (`bg-zinc-100`) | `#18181B` (`bg-zinc-900`) | `#3F3F46` / `#FAFAFA` | `px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200` |

---

### 3.4 Sidebar Navigation Buttons (ปุ่มเมนูด้านข้าง)

| Menu State | Light Theme | Dark Theme | Text & Icon Color | Tailwind Classes |
| :--- | :--- | :--- | :--- | :--- |
| **Active Nav Item** (หน้าปัจจุบัน) | `#FEE2E2` (`bg-red-50`) | `#3B1219` (`bg-red-950/60`) | `#DC2626` (Light) / `#F87171` (Dark) | `bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-semibold rounded-xl` |
| **Inactive Nav Item** | Transparent | Transparent | `#52525B` (Light) / `#A1A1AA` (Dark) | `text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl` |

---

### 3.5 Pagination & Control Buttons (ปุ่มเปลี่ยนหน้าและสวิตช์โหมด)

| Element | Light Theme | Dark Theme | Tailwind Classes |
| :--- | :--- | :--- | :--- |
| **Pagination Arrow Buttons** | `#FFFFFF` (`bg-white`) / `#F4F4F5` | `#18181B` (`bg-zinc-900`) / `#27272A` | `p-2 rounded-lg bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400` |
| **Pagination Disabled Arrow** | Background opacity-50 | Background opacity-50 | `text-zinc-300 dark:text-zinc-600 cursor-not-allowed` |
| **Theme Switcher Pill** (โหมดสว่าง/มืด) | `#F4F4F5` (`bg-zinc-100`) | `#18181B` (`bg-zinc-900`) | `px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200` |
| **Logout Button** | Transparent | Transparent | `text-zinc-500 hover:text-red-500 font-medium` |

---

## 🔢 4. Number & Financial Display Styling (การกำหนดสีตัวเลขและสถิติ)

### 4.1 Number & Price Colors Matrix

| Types of Numbers | Light Theme Hex | Dark Theme Hex | Tailwind Classes | Description / Example |
| :--- | :--- | :--- | :--- | :--- |
| **Menu Regular Price (ราคาอาหาร)** | `#DC2626` / `#EF4444` | `#EF4444` / `#F87171` | `text-red-600 dark:text-red-400 font-bold` | แสดงราคาสินค้า เช่น `199 ฿`, `80 ฿`, `250 ฿` |
| **Total Net Sales (ยอดขายส่งมอบสุทธิ)** | `#09090B` (Zinc 950) | `#FAFAFA` (Zinc 50) | `text-zinc-900 dark:text-zinc-50 font-extrabold text-2xl` | ตัวเลขสรุปยอดขาย เช่น `3,792 ฿` |
| **Total Discount (ส่วนลดรวมทั้งหมด)** | `#DC2626` / `#EF4444` | `#EF4444` / `#F87171` | `text-red-600 dark:text-red-400 font-bold` | ตัวเลขลบแสดงส่วนลด เช่น `-1,086 ฿` |
| **Bill Count (จำนวนบิลเช็คแล้ว)** | `#09090B` (Zinc 950) | `#FAFAFA` (Zinc 50) | `text-zinc-900 dark:text-zinc-50 font-bold` | ตัวเลขจำนวนบิล เช่น `5 บิล` |
| **Void Count (ออเดอร์ถูกยกเลิก)** | `#09090B` (Zinc 950) | `#FAFAFA` (Zinc 50) | `text-zinc-900 dark:text-zinc-50 font-bold` | ตัวเลขจำนวน Void เช่น `0 รายการ (0 ฿)` |
| **Order Number Badge** | Background `#DC2626` | Background `#DC2626` | `bg-red-600 text-white font-bold px-2.5 py-1 rounded-md text-xs` | Badge เลขออเดอร์ เช่น `ORD-47`, `ORD-46` |
| **Promotion Saved Amount** | `#DC2626` / `#EF4444` | `#EF4444` / `#F87171` | `text-red-600 dark:text-red-400 text-xs` | ตัวเลขประหยัด เช่น `ประหยัด -120 ฿` |

---

### 4.2 KPI Badge Icon Backgrounds

| Badge Icon Type | Icon Color | Background Color (Light) | Background Color (Dark) | Tailwind Classes |
| :--- | :--- | :--- | :--- | :--- |
| **Net Sales Icon (กราฟขึ้น)** | `#10B981` (Green) | `#D1FAE5` (`bg-emerald-100`) | `#064E3B/60` (`bg-emerald-950/60`) | `p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500` |
| **Discount Icon (ป้ายราคา)** | `#EF4444` (Red) | `#FEE2E2` (`bg-red-100`) | `#451A22` (`bg-red-950/60`) | `p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-500` |
| **Bill Count Icon (ใบเสร็จ/เงิน)** | `#F59E0B` (Amber) | `#FEF3C7` (`bg-amber-100`) | `#451A03/60` (`bg-amber-950/60`) | `p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-500` |
| **Void Icon (ถังขยะ)** | `#64748B` (Zinc/Slate) | `#F4F4F5` (`bg-zinc-100`) | `#27272A` (`bg-zinc-800`) | `p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400` |

---

## 🛠️ 5. Implementation Quick Reference

```tsx
// 1. Primary Red Button
export const primaryBtn = "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium px-4 py-2 rounded-full transition-all shadow-none border-none";

// 2. Active Category Chip
export const categoryActiveChip = "bg-red-600 text-white font-medium px-4 py-1.5 rounded-full shadow-none border-none";

// 3. Inactive Category Chip
export const categoryInactiveChip = "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 py-1.5 rounded-full shadow-none border-none transition-all";

// 4. Table Action Icon (Pencil Edit)
export const editIconBtn = "p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border-none";

// 5. Table Action Icon (Trash Delete)
export const deleteIconBtn = "p-2 rounded-full bg-red-100 dark:bg-red-950/50 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/60 transition-all border-none";

// 6. Highlight Red Price Number
export const priceText = "text-red-600 dark:text-red-400 font-bold text-base";
```

---

## 🔻 6. Custom Dropdown / Select Specification (ข้อกำหนดมาตรฐาน Dropdown)

เพื่อสร้างมาตรฐาน UI เดียวกันทั้งระบบ POS Component `CustomSelect` ถูกออกแบบเป็น Reusable UI Component อยู่ที่ [`components/ui/select.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/ui/select.tsx)

### 6.1 Key Features & Specs
1. **Portal Floating Layer (`createPortal`)**: Popover ลอยด้วย `position: fixed` + `zIndex: 99999` ไม่โดนตัดขอบโดย Container หรือถูกบังโดย Modal Footers / Buttons
2. **Smart Auto-Positioning**: คำนวณพื้นที่อัตโนมัติ หากพื้นที่ด้านล่างไม่พอ (< 300px) จะสลับเปิดขึ้นด้านบน (`placeAbove`)
3. **Scrollable Option Limit**: แสดงผลประมาณ 10 รายการด้วย `max-h-[260px] overflow-y-auto`
4. **Sticky Bottom Action Button**: ปุ่ม `+ เพิ่มรายการใหม่...` หรือ `+ เพิ่มชื่อวัตถุดิบใหม่...` ถูกตรึง (`sticky bottom-0`) อยู่ด้านล่างเสมอแม้เลื่อนดูรายการ
5. **Search Input Toggle (`searchable`)**:
   - `searchable={true}`: แสดงช่องค้นหาด้านบน Popover (เหมาะสำหรับตัวเลือกจำนวนมาก เช่น รายชื่อวัตถุดิบ)
   - `searchable={false}` (Default): **ไม่แสดง**ช่องค้นหา (เหมาะสำหรับตัวเลือกสั้นๆ เช่น หน่วยสินค้า)

### 6.2 Implementation Usage
```tsx
import { CustomSelect } from '@/components/ui/select';

// 1. Dropdown ที่มีช่องค้นหา + ปุ่มเพิ่มรายการใหม่
<CustomSelect
  value={selectedItem}
  onChange={setSelectedItem}
  options={['แซลมอนสด', 'ปลาซาบะ', 'กุ้งสด']}
  placeholder="-- เลือกวัตถุดิบ --"
  searchable={true}
  addNewLabel="+ เพิ่มชื่อวัตถุดิบใหม่..."
  onAddNew={() => openNewItemModal()}
/>

// 2. Dropdown สั้นๆ ไม่มีช่องค้นหา
<CustomSelect
  value={selectedUnit}
  onChange={setSelectedUnit}
  options={['กก.', 'ขีด', 'กรัม', 'แพ็ค']}
  placeholder="หน่วย"
  searchable={false}
/>
```
