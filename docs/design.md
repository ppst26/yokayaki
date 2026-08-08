# Yokayaki POS — Core Design System Guidelines (`docs/design.md`)

> **คู่มือมาตรฐานการออกแบบ UI/UX สำหรับระบบ Yokayaki POS**  
> **อัปเดตล่าสุด:** 8 สิงหาคม 2569  
> **สถานะ:** มาตรฐานหลักของระบบ (Active Standard)

---

## 🎨 1. Navigation Menu Links (มาตรฐานแถบเมนูและลิงก์)

### 🔴 Active Menu State (เมนูที่ถูกเลือกใช้งาน)
- **สไตล์:** ใช้สีแดงสดทึบ (Solid Red) พร้อมเงาประประกาย (Red Shadow Glow)
- **Tailwind Classes:**  
  `bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25 border-none rounded-xl`
- ** Mobile Bottom Nav:**  
  ไอคอนเปลี่ยนเป็นพื้นหลังสีแดงสด `bg-red-600 text-white shadow-md shadow-red-600/30 p-1.5 rounded-xl`

### ⚪ Inactive Menu State (เมนูที่ยังไม่ได้เลือก)
- **สไตล์:** ไร้เส้นขอบ ไร้สีพื้นหลัง (Clean, Borderless & Transparent)
- **Tailwind Classes:**  
  `text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 border-none rounded-xl`

### 📱 Mobile Top Header Menu Button (ปุ่มแฮมเบอร์เกอร์มุมขวาบน)
- **สไตล์:** Clean Icon Button ไร้เส้นขอบ ไร้พื้นหลัง
- **Tailwind Classes:**  
  `p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 transition-all active:scale-90 border-none bg-transparent`

---

## 🏷️ 2. Badges & Filter Pills (มาตรฐานป้ายกรองข้อมูล)

### 🎯 Active Filter Badge (ป้ายฟิลเตอร์ที่ถูกเลือก)
- **สไตล์:** สีแดงทึบคมชัด โดดเด่น
- **Tailwind Classes:**  
  `bg-red-600 text-white font-black shadow-md shadow-red-600/25 border-none px-3.5 py-1.5 rounded-xl`

### 🌫️ Inactive Filter Badge (ป้ายฟิลเตอร์ที่ไม่ได้เลือก)
- **สไตล์:** ไร้พื้นหลังทึบ ไร้เส้นขอบ (Clean Transparent)
- **Tailwind Classes:**  
  `text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 hover:bg-slate-100/60 dark:hover:bg-neutral-800/60 border-none px-3.5 py-1.5 rounded-xl`

---

## 👨‍🍳 3. Kitchen Screen Icons & Actions (มาตรฐานการ์ดห้องครัว KDS)

### ✅ Check Serve Button (ปุ่มกดเสิร์ฟรายการ)
- **สไตล์:** วงกลมสีเขียวสดไล่ระดับ (Gradient Emerald Green) พร้อมไอคอนสีขาว
- **Tailwind Classes:**  
  `w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-600 text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 border-none cursor-pointer flex items-center justify-center`

### 🍲 Order Quantity Text (จำนวนรายการอาหาร)
- **สไตล์:** ข้อความคมชัด ไร้ป้ายพื้นหลังทึบ
- **Tailwind Classes:**  
  `text-xs font-black text-slate-700 dark:text-neutral-300 ml-1`

### ⏱️ KDS Header Timer Pill (ป้ายเวลารออาหาร)
- **สไตล์:** ป้ายสีขาวทึบขอบชัด ตัวหนังสือเข้มอ่านง่ายจากระยะไกล
- **Normal Wait Time (< 8 นาที):** `bg-white text-slate-900 font-black shadow-xs px-3 py-1.5 rounded-full`
- **Warning Wait Time (8-14 นาที):** `bg-amber-100 text-amber-950 font-black shadow-xs px-3 py-1.5 rounded-full`
- **Critical Wait Time (15+ นาที):** `bg-amber-300 text-slate-950 font-black shadow-md animate-bounce px-3 py-1.5 rounded-full`
- **Header Subtitle:** `text-xs text-white font-extrabold block opacity-95`

---

## 📊 4. Tables & Reusable Pagination (มาตรฐานตารางและตัวเปลี่ยนหน้า)

### 📐 Table Corners & Headers
- **Container Corners:** `rounded-sm border border-slate-200/80 dark:border-neutral-800 shadow-2xs`
- **Table Headers:** `bg-neutral-800 text-white font-black text-[11px] uppercase tracking-wider first:rounded-tl-sm last:rounded-tr-sm`

### 📄 Dropdown Select & Pagination Buttons
- **Dropdown Trigger:** `bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 shadow-2xs text-slate-800 dark:text-neutral-100 font-bold rounded-xl hover:bg-slate-50`
- **Pagination Prev/Next Buttons:** `bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 rounded-xl p-2 shadow-2xs font-bold cursor-pointer active:scale-95 disabled:opacity-40`

---

## 📱 5. Mobile Bottom Navigation Bar (มาตรฐานแถบเมนูด้านล่างบนมือถือ)

- **ตำแหน่ง:** `fixed bottom-0 inset-x-0 z-40 md:hidden`
- **สไตล์:** `bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800 px-3 py-1.5 flex items-center justify-around shadow-lg`
- **Main Content Bottom Padding:** `pb-24 md:pb-8`
