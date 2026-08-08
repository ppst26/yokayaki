# Mobile Bottom Navigation Bar — Design Spec

> **ตำแหน่งไฟล์สเปก:** `docs/superpowers/specs/2026-08-08-mobile-bottom-nav-design.md`  
> **วันอัปเดตล่าสุด:** 8 สิงหาคม 2569  
> **สถานะ:** ใช้งานบน Production (Active)

---

## 🎯 Overview
Add a sticky Mobile Bottom Navigation Bar (`fixed bottom-0 inset-x-0 z-40`) to `SidebarNav.tsx` providing 1-tap quick access to **Table Map (ผังโต๊ะ)**, **Kitchen Screen (หน้าครัว)**, **Order History (ออเดอร์)**, and **More Menu (เพิ่มเติม)** drawer for mobile devices.

---

## 📐 Component Architecture

### 1. Mobile Bottom Bar Items (`md:hidden`)
- **`ผังโต๊ะ` (Table Map):** Tab `'floor'` | Icon: `<Layers />`
- **`หน้าครัว` (Kitchen Screen):** Tab `'kitchen'` | Icon: `<ChefHat />`
- **`ออเดอร์` (Sales History):** Tab `'history'` | Icon: `<History />`
- **`เพิ่มเติม` (More Drawer):** Triggers `setIsMobileMenuOpen(true)` | Icon: `<Menu />`

### 2. UI & Interaction Styling
- **Positioning:** `fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800 px-2 py-1.5 shadow-lg`.
- **Active State:** Red icon + bold title `text-red-600 dark:text-red-400 font-black` with red tint background `bg-red-50 dark:bg-red-950/50`.
- **Inactive State:** `text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-800`.
- **Main Layout Padding:** Add `pb-20 md:pb-8` on `<main>` in `TableMap.tsx` to prevent content obscuration on mobile view.

---

## 📁 Files Affected
- `components/common/SidebarNav.tsx`
- `components/common/TableMap.tsx`
