# Fullscreen Motion Cart Panel Spec

## Overview
This design adds a "ดูรายการทั้งหมด" (View All Items) badge button to the cart header on the Staff POS Order screen (`CartPanel.tsx`) and introduces a smooth fullscreen motion slide-up mode on mobile screens.

---

## Detailed Specifications

### 1. Header Bar (`CartPanel.tsx`)
- Badge Button: Positioned next to `ตะกร้า (X รายการ)`.
  - Normal / Compact mode text: `ดูรายการทั้งหมด ⛶`
  - Fullscreen mode text: `ย่อหน้าจอ 🗗`
  - Styling: `bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 active:scale-95 cursor-pointer`
- Arrow toggle: `ChevronUp` (when compact) / `ChevronDown` (when expanded/fullscreen).

### 2. Fullscreen Motion Panel State & Styling
- State: `isFullScreen` (boolean) controlled by header badge button or double-tap toggle.
- Normal Mode classes: `fixed bottom-0 left-0 right-0 z-40 max-h-[85vh]`
- Fullscreen Mode classes: `fixed inset-0 z-50 w-full h-full max-h-screen rounded-none bg-white dark:bg-neutral-900 shadow-2xl transition-all duration-300 ease-out`
- In Fullscreen mode:
  - The items scroll area expands to fill the entire screen (`flex-1 max-h-none overflow-y-auto`).
  - Staff can easily review long order lists before submitting.

### 3. Sticky Bottom Action Footer
- The `ส่งเข้าครัว (XXX ฿)` button remains fixed at the bottom of the screen in both normal and fullscreen modes.

---

## Files to Modify
- [CartPanel.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/order/CartPanel.tsx)
- [POSOrderScreen.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/order/POSOrderScreen.tsx)
