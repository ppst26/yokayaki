# Responsive Mobile Layout for Ingredient Purchase Order Modal

## Overview
Redesign the ingredient rows in `IngredientPurchaseManager.tsx` modal to be fully responsive on mobile devices (`< 640px`) using a **Stacked Card Layout (2 lines per item)** while maintaining the **5-Column Table Row Layout** on desktop screens (`≥ 640px`). This prevents horizontal scrolling and clipping on narrow screens.

---

## Detailed Design Specifications

### 1. Header Area (Column Titles)
- **Mobile (`< 640px`):** Hide the desktop 5-column header text grid (`hidden sm:grid`).
- **Desktop (`≥ 640px`):** Retain the 5-column header text grid `[ชื่อวัตถุดิบ, จำนวน, หน่วย, ราคา/หน่วย, ลบ]`.

### 2. Ingredient Row Layout (Per Item)

#### Mobile View (`< 640px`) — Stacked Card Layout
Each ingredient item row becomes a card with `bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-2`:
- **Line 1 (Name & Delete Button):**
  - Left: `CustomSelect` for ingredient name (Searchable, full-width `flex-1`).
  - Right: `Trash2` button (padded icon button, `text-zinc-400 hover:text-rose-500`).
- **Line 2 (Quantity, Unit, Price per Unit):**
  - A 3-column grid `grid-cols-3 gap-2`:
    1. Quantity: `number` input with label or placeholder (`จำนวน`).
    2. Unit: `CustomSelect` dropdown (`หน่วย`).
    3. Price per Unit: `number` input with label or placeholder (`ราคา/หน่วย`).

#### Desktop View (`≥ 640px`) — 5-Column Table Grid Layout
- Retains existing 5-column grid `sm:grid sm:grid-cols-[1fr_80px_100px_90px_32px] sm:gap-2 sm:items-center sm:bg-transparent sm:p-0 sm:border-none sm:space-y-0`.

---

## Affected Files
- [IngredientPurchaseManager.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/stock/IngredientPurchaseManager.tsx) — Responsive grid/card styling update for modal ingredient rows.

---

## Verification Plan
1. Test mobile viewport width (`375px`, `414px`) to verify zero horizontal scrolling or clipping.
2. Verify all inputs (ingredient name dropdown, quantity, unit dropdown, price per unit) function correctly.
3. Test adding, editing, and deleting ingredient rows on mobile layout.
4. Verify desktop view (`≥ 640px`) remains intact and horizontal 5-column grid renders cleanly.
