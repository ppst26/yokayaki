# Solid Active Menu Badges Redesign — Design Spec

> **ตำแหน่งไฟล์สเปก:** `docs/superpowers/specs/2026-08-08-solid-active-menu-design.md`  
> **วันอัปเดตล่าสุด:** 8 สิงหาคม 2569  
> **สถานะ:** ใช้งานบน Production (Active)

---

## 🎯 Overview
Redesign active and inactive menu badges/tabs across navigation components (`SidebarNav.tsx`, `DateFilterBar.tsx`, `MenuManager.tsx`, `SalesHistory.tsx`):
- **Inactive State:** Clean, borderless, transparent background without extra tint.
- **Active State:** Bold solid red background `bg-red-600 text-white font-black shadow-md shadow-red-600/25`.

---

## 📐 Component Specs

### 1. Sidebar Nav (`components/common/SidebarNav.tsx`)
- **Active Item (Desktop Sidebar & Mobile Drawer):** `bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25`
- **Active Item (Mobile Bottom Nav):** `bg-red-600 text-white font-extrabold shadow-sm shadow-red-600/30 rounded-xl px-3 py-1`
- **Inactive Item:** `text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60` (no border, clean background)

### 2. Date Filter Bar (`components/dashboard/DateFilterBar.tsx`)
- **Active Badge:** `bg-red-600 text-white font-black shadow-md shadow-red-600/25 border-none`
- **Inactive Badge:** `text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 bg-transparent border-none`

### 3. Menu Category Filter (`components/menu/MenuManager.tsx`)
- **Active Badge:** `bg-red-600 text-white font-black shadow-md shadow-red-600/25 border-none`
- **Inactive Badge:** `text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 bg-transparent border-none`

### 4. Sales History Range Toggle (`components/sales/SalesHistory.tsx`)
- **Active Badge:** `bg-red-600 text-white font-black shadow-md shadow-red-600/25 border-none`
- **Inactive Badge:** `text-slate-600 dark:text-neutral-400 hover:text-slate-900 bg-transparent border-none`

---

## 📁 Files Affected
- `components/common/SidebarNav.tsx`
- `components/dashboard/DateFilterBar.tsx`
- `components/menu/MenuManager.tsx`
- `components/sales/SalesHistory.tsx`
