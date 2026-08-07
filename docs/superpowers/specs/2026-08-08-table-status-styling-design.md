# Table Status Visual Styling Design

## Overview
This feature updates the visual styling of table cards on the POS Table Map (`TableMap.tsx` / `TableCard.tsx`) to clearly reflect table statuses:
1. **Vacant (`vacant`)**: White background with clean neutral text and a soft green status tag.
2. **Occupied (`occupied`)**: Yellow-to-orange gradient background (`from-amber-400 via-amber-500 to-orange-600`) with high contrast text.
3. **Checking Out (`checking_out`)**: Red gradient background (`from-red-600 via-rose-600 to-red-700`) with animated pulsing/blinking glow effect (`animate-pulse`) and a ringing bell icon badge when a customer requests check bill from `/customer/[session_id]`.

---

## Detailed Visual Specifications

### 1. Vacant (`vacant`)
- **Card Background**: Crisp white (`bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800`).
- **Header Text**: `text-slate-900 dark:text-neutral-100`.
- **Status Badge**: `bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50` -> `ว่าง (VACANT)`.
- **Action Label**: `เปิดออเดอร์ใหม่`.
- **Icon**: `ShoppingBag`.

### 2. Occupied (`occupied`)
- **Card Background**: Yellow-to-orange gradient (`bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20`).
- **Header Text**: `text-white font-black`.
- **Status Badge**: `bg-white/20 backdrop-blur-xs text-white border border-white/30` -> `มีลูกค้า`.
- **Action Label**: `จัดการออเดอร์`.
- **Icon**: `Receipt`.

### 3. Checking Out (`checking_out`)
- **Card Background**: Red gradient with pulsing animation (`bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-xl shadow-red-600/40 animate-pulse ring-4 ring-red-400/50`).
- **Header Text**: `text-white font-black`.
- **Status Badge**: `bg-white/30 backdrop-blur-xs text-white border border-white/40 flex items-center gap-1` -> `🔔 เรียกเช็คบิล`.
- **Action Label**: `เช็คบิล / ชำระเงิน`.
- **Icon**: `Receipt` (or `BellRing`).

---

## User Interaction & Realtime Updates
1. When customer clicks "เรียกเช็คบิล" on `/customer/[session_id]`, `tables.status` updates to `'checking_out'`.
2. Supabase Postgres Realtime triggers update on `TableMap.tsx`.
3. Clicking a table card with status `occupied` or `checking_out` opens the action selector modal to let staff proceed to POS order management or Checkout screen.

---

## Files to Modify
- [TableCard.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/common/TableCard.tsx)
- [TableMap.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/common/TableMap.tsx)
