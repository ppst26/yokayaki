# Staff POS Order Cart Sheet Redesign Spec

## Overview
This design updates the `CartPanel` component on the Staff POS Order Screen (`POSOrderScreen.tsx`) to provide a fixed-height, scrollable cart items list with a sticky "ส่งเข้าครัว" (Send to Kitchen) bottom button, and a toggleable expand/collapse header with an arrow icon.

---

## Detailed Specifications

### 1. Header Bar (`CartPanel.tsx`)
- Title: `ตะกร้า (X รายการ)`
- Price: `XXX ฿` with high-contrast accent.
- Toggle Action: Clicking the header or the arrow icon toggles `mobileCartExpanded` state.
- Icon: `ChevronUp` / `ChevronDown` (with red highlight indicator when collapsed).

### 2. Cart Items Container
- **Compact / Default View**:
  - Container height limited to ~320px on mobile.
  - Cart items list is scrollable (`max-h-[180px] sm:max-h-[220px] overflow-y-auto no-scrollbar`).
- **Expanded View**:
  - Sheet expands up to `max-h-[85vh]` on mobile to view long order lists and submitted kitchen items.

### 3. Sticky Footer ("ส่งเข้าครัว" Button)
- Placed outside the scrollable item list, pinned at the bottom footer of `CartPanel`.
- Styling: `p-4 border-t border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0`.
- Includes PIN auth / quick submit button and `ส่งเข้าครัว (XXX ฿)`.

---

## Files to Modify
- [CartPanel.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/order/CartPanel.tsx)
- [POSOrderScreen.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/order/POSOrderScreen.tsx)
