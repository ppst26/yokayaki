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

ใช้ utility ร่วมใน `globals.css`: `badge-pill` + `badge-active` / `badge-inactive`  
ใช้ใน MenuManager · MenuGrid · DateFilterBar

| State | Background Color | Text Color | Tailwind Classes |
| :--- | :--- | :--- | :--- |
| **Base (`badge-pill`)** | — | — | `rounded-lg px-2.5 py-1 text-xs font-semibold` |
| **Active Category** (เลือกอยู่) | `#DC2626` (`bg-red-600`) | `#FFFFFF` (`text-white`) | `badge-active` → `shadow-sm shadow-red-600/20` |
| **Inactive (Light)** | `#FFFFFF` | `#475569` (`text-slate-600`) | `badge-inactive` → border + hover |
| **Inactive (Dark)** | `#262626` (`bg-neutral-800`) | `#D4D4D4` (`text-neutral-300`) | `badge-inactive` dark variant |

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

// 2. Active Category Chip (badge-pill + badge-active)
export const categoryActiveChip = "badge-pill badge-active";

// 3. Inactive Category Chip (badge-pill + badge-inactive)
export const categoryInactiveChip = "badge-pill badge-inactive";

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

---

## 🔤 7. Typography Hierarchy & Font Specification (ข้อกำหนดตัวอักษรและ Noto Sans Thai)

ระบบ **YOKAYAKI POS** ใช้ **Noto Sans Thai** เป็น Primary Font สำหรับข้อความภาษาไทยและภาษาอังกฤษทั่วทั้งแอปพลิเคชัน เพื่อความอ่านง่าย คมชัด และเป็นมืออาชีพ พร้อมใช้ **Geist Mono** ร่วมกับ `tabular-nums` สำหรับตัวเลข ราคา และจำนวน

### 7.1 Font Engine Setup
- **Primary Font**: `Noto Sans Thai` (`--font-noto-sans-thai`)
- **Monospace Font**: `Geist Mono` (`--font-geist-mono`)
- **Root Variable Mapping**: `--font-sans` และ `--font-heading` แมปกับ `var(--font-noto-sans-thai), system-ui, sans-serif` ใน `globals.css`
- **Thai Tone Mark Clearance**: กำหนด `leading-relaxed` สำหรับ Body Text และ `leading-snug` สำหรับ Headings เพื่อป้องกันสระและวรรณยุกต์ลอยทับซ้อน

### 7.2 Standard 8-Level Typography Hierarchy Scale

| Level | Class / Utility | Size | Font Weight | Line Height & Tracking | Target Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | `.text-display` | `30px - 36px` (`text-3xl / text-4xl`) | `font-bold` / `font-black` | `leading-tight tracking-tight` | ยอดรวมเงิน POS, ยอดขายหลักใน Dashboard, ปุ่มตัวเลข PinPad |
| **Heading 1** | `.text-h1` | `24px` (`text-2xl`) | `font-bold` | `leading-snug tracking-tight` | หัวข้อหลักของแต่ละหน้า (ผังโต๊ะ, สต็อกสินค้า, KDS, Dashboard) |
| **Heading 2** | `.text-h2` | `18px - 20px` (`text-lg / text-xl`) | `font-bold` / `font-semibold` | `leading-snug` | หัวข้อ Modal & Drawer, Card headers, ชื่อโต๊ะ |
| **Heading 3** | `.text-h3` | `16px` (`text-base`) | `font-semibold` | `leading-normal` | ชื่อรายการอาหารในเมนู/ตะกร้า, หัวข้อตาราง, Category Tab labels |
| **Body Primary** | `.text-body` | `14px` (`text-sm`) | `font-normal` / `font-medium` | `leading-relaxed` | คำอธิบายรายการอาหาร, Form input text, ข้อความหลักทั่วไป |
| **Caption / Meta** | `.text-caption` | `12px` (`text-xs`) | `font-normal` / `font-medium` | `leading-normal text-muted-foreground` | หมายเหตุโน้ตพิเศษ, เวลาออเดอร์, Subtitle, Help text |
| **Micro Tag** | `.text-micro` | `10px - 11px` (`text-[10px] / text-[11px]`) | `font-semibold` / `font-bold` | `tracking-wider uppercase` | Badge สถานะ (โต๊ะว่าง, โต๊ะมีลูกค้า, สต็อกเหลือน้อย, pending) |
| **Numeric / Price** | `.text-price` | Varied size | `font-mono` | `tabular-nums` | ราคาสินค้า (`฿150`), ตัวเลขจำนวน (`x2`), เวลา, เบอร์โทร |

---

## 🏷️ 8. Promotion Card Specification (การ์ดโปรโมชั่น — Owner)

Component: [`components/promo/PromoManager.tsx`](components/promo/PromoManager.tsx)  
Spec รายละเอียด: [`docs/superpowers/specs/2026-09-08-promo-card-image-banner-design.md`](docs/superpowers/specs/2026-09-08-promo-card-image-banner-design.md)  
อัปเดตล่าสุด: 8 กันยายน 2026

### 8.1 Layout Structure (โครงสร้างการ์ด)

แนวคิด: **"Poster Card"** — รูปโปรโมชั่นเป็น Hero ด้านบน ข้อมูลและ action อยู่ใต้รูป กระชับพื้นที่แนวตั้ง

```
┌──────────────────────────────┐
│ ████ รูปโปรโมชั่น (h-40) ████ │  ← Banner + badge overlay
│ [ประเภทโปร]    [เปิด/ปิด]     │
├──────────────────────────────┤
│ ชื่อโปรโมชั่น                  │
│ [ลด 10%] [รหัส: HEE] [แก้ไข][ลบ]│  ← แถวเดียวกัน (ml-auto)
│ Happy Hour: 17:00 - 19:00 น.  │  ← แสดงเมื่อมีช่วงเวลา
│ สร้างเมื่อ …         ID: #2  │  ← Footer
└──────────────────────────────┘
```

| Zone | ความสูง / Spacing | Tailwind Classes |
| :--- | :--- | :--- |
| **Banner** | `160px` | `relative h-40 w-full shrink-0` |
| **Card Body** | padding `16px` | `flex flex-col gap-3 p-4` |
| **Grid** | 1 / 2 / 3 คอลัมน์ | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` |

### 8.2 Image Banner & Placeholder

| State | การแสดงผล | Tailwind Classes |
| :--- | :--- | :--- |
| **มีรูป** (`image_url`) | แบนเนอร์เต็มความกว้าง crop กลาง | `size-full object-cover` |
| **ไม่มีรูป** | Gradient อ่อน + ไอคอน `Tag` | `bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-neutral-800 dark:to-neutral-900` |
| **โปรปิด** (`is_active = false`) | การ์ดทั้งใบจาง + grayscale | `opacity-65 grayscale-[20%]` |

รูปอัปโหลดผ่าน `ImageUploadField` (folder `promo`) เก็บ public URL ใน `promotions.image_url` — ดู flow อัปโหลด R2 ที่ [`docs/superpowers/specs/2026-09-03-menu-promo-r2-upload-design.md`](docs/superpowers/specs/2026-09-03-menu-promo-r2-upload-design.md)

### 8.3 Overlay Badges (ทับบนรูป)

วาง `absolute inset-x-0 top-0` พร้อม `p-3 flex justify-between` — ใช้ `backdrop-blur-sm` + พื้นหลังโปร่ง (`/90`) ให้อ่านได้ทั้งรูปสว่างและมืด

| Badge | ประเภทโปร | Light Theme | Dark Theme |
| :--- | :--- | :--- | :--- |
| **Type Badge** | `percentage` | Rose 50 / Rose 600 | Rose 950/80 / Rose 400 |
| **Type Badge** | `fixed` (คูปอง) | Amber 50 / Amber 600 | Amber 950/80 / Amber 400 |
| **Type Badge** | `buy_x_get_y` | Indigo 50 / Indigo 600 | Indigo 950/80 / Indigo 400 |
| **Status Active** | เปิดใช้งาน | Emerald 50 + จุด pulse เขียว | Emerald 950/80 |
| **Status Inactive** | ปิดอยู่ | Slate 100 / Slate 400 | Neutral 800/90 |

ไอคอนประเภท: `TicketPercent` (%) · `Tag` (คูปอง) · `Gift` (ซื้อแถม)

### 8.4 Body Content & Inline Actions

**แถว Badge + ปุ่ม** — ใช้ `flex flex-wrap items-center gap-2` ปุ่มแก้ไข/ลบอยู่ปลายแถวเดียวกับ badge ส่วนลดและรหัส (`ml-auto shrink-0`) เพื่อลดความสูงการ์ด

| Element | Style | Tailwind Classes |
| :--- | :--- | :--- |
| **ชื่อโปร** | Heading 3 | `font-extrabold text-base leading-snug text-slate-900 dark:text-neutral-100` |
| **Value Badge** (ลด X%) | แดงทึบ | `bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-md` |
| **เงื่อนไข** (ขั้นต่ำ / รหัส / เมนู) | Chip อ่อน | `text-[11px] font-bold bg-slate-100 dark:bg-neutral-800 rounded-md` |
| **รหัสคูปอง** | Mono + แดงเน้น | `font-mono text-red-600 dark:text-red-400 font-extrabold` |
| **Happy Hour** | Caption + Clock icon | `text-[11px] font-semibold text-slate-500` |
| **แก้ไข** | Compact inline | `rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold` |
| **ลบ** | Compact inline | `rounded-lg bg-rose-50 text-rose-600 px-2.5 py-1 text-[11px] font-bold` |
| **Footer** | Meta | `border-t pt-2 text-[10px] text-slate-400` — วันที่สร้าง + `ID: #n` |

### 8.5 Implementation Quick Reference

```tsx
// Promotion Card — โครงสร้างหลัก
<Card className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md flex flex-col">
  {/* Banner */}
  <div className="relative h-40 w-full shrink-0 bg-slate-100 dark:bg-neutral-800">
    {imageUrl ? (
      <img src={imageUrl} alt={name} className="size-full object-cover" />
    ) : (
      <div className="flex size-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200/80">
        <Tag className="size-10 text-slate-300" />
      </div>
    )}
    {/* Overlay: type badge (ซ้าย) + status toggle (ขวา) */}
    <div className="absolute inset-x-0 top-0 flex justify-between gap-2 p-3">...</div>
  </div>

  {/* Body */}
  <div className="flex flex-col gap-3 p-4">
    <h3 className="font-extrabold text-base">{name}</h3>
    <div className="flex flex-wrap items-center gap-2">
      <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-md">ลด 10%</span>
      {/* badges เงื่อนไข ... */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {/* แก้ไข / ลบ */}
      </div>
    </div>
    <div className="flex justify-between border-t pt-2 text-[10px] text-slate-400">...</div>
  </div>
</Card>
```

> **หมายเหตุ:** การ์ดโปรโมชั่น Owner ใช้ `border` + `shadow-xs` เล็กน้อย (ต่างจาก Card หลักใน §1 ที่เป็น Flat ไม่มี border) เพื่อแยกการ์ดใน grid ให้ชัด — สอดคล้องกับ pattern การ์ดจัดการอื่นในระบบ

