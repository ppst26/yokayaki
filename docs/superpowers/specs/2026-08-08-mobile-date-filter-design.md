# Mobile Date Filter UI Redesign — Segmented Control & Capsule Date Picker

## Overview
Redesign the `DateFilterBar` component on mobile screens (`< 640px`) to use a sleek **Segmented Control** tab bar for preset options and a **Capsule-style Floating Badge Date Picker** when custom date range is selected.

---

## Proposed Layout & Design System

### 1. Segmented Control Filter Tabs
- Container: `bg-slate-100 dark:bg-neutral-800/80 p-1 rounded-2xl`
- Scrollable/Flex container for preset options (`วันนี้`, `เมื่อวาน`, `สัปดาห์นี้`, `เดือนนี้`, `3 เดือน`, `6 เดือน`, `กำหนดเอง`).
- Active Preset: `bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 shadow-xs font-black rounded-xl transition-all duration-200`
- Inactive Preset: `text-slate-500 dark:text-neutral-400 font-bold hover:text-slate-800 dark:hover:text-neutral-200`

### 2. Custom Date Range Pickers (Capsule Style)
When `datePreset === 'custom'`:
- Renders a clean floating capsule container (`bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700/80 rounded-2xl p-2.5 shadow-xs transition-all animate-in fade-in-50 zoom-in-95`).
- Grid/Flex layout of two date input capsules:
  - Start Date: `[ 📅 เริ่มต้น: YYYY-MM-DD ]`
  - Separator arrow: `➔`
  - End Date: `[ 📅 สิ้นสุด: YYYY-MM-DD ]`
- Enhanced date input styling with `cursor-pointer font-bold text-xs` and clean borders.

---

## Affected Files
- `components/dashboard/DateFilterBar.tsx` — Update UI structure & Tailwind classes for mobile & desktop views.

---

## Verification Plan
1. Test mobile view (`< 640px`) for smooth scrollable segmented controls.
2. Verify active state switching (`bg-white` active pill).
3. Test selecting "กำหนดเอง" and picking start/end dates.
4. Verify desktop view layout consistency (`≥ 640px`).
