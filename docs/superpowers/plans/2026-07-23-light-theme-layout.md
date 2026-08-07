# Light Theme & CHILI POS Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Yokayaki POS to a clean, modern Light Theme (`bg-gray-100` backdrop, `bg-white` cards/panels, YokaYaki Red `bg-red-600` accent color) with a 3-column layout structure inspired by CHILI POS, preserving 100% of existing database schema and logic.

**Architecture:** Update `globals.css` base styling and refactor component UI containers across `TableMap.tsx`, `POSOrderScreen.tsx`, `CheckoutScreen.tsx`, `KitchenScreen.tsx`, management screens, and `PinPad.tsx`. Standardize layouts to use flex/grid containers, white rounded-2xl cards with `shadow-sm`, and red primary action targets.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 (`@import "tailwindcss";`), Lucide React icons, Supabase JS Client.

## Global Constraints

- **Theme background**: Page canvas must use `bg-gray-100` (`#f3f4f6`).
- **Primary cards/surfaces**: Must use `bg-white`, `border border-slate-200/80`, `rounded-2xl`, `shadow-sm`.
- **Secondary / Accent color**: **YokaYaki Red** (`bg-red-600`, `hover:bg-red-700`, `text-red-600`, `ring-red-500`).
- **Typography**: Slate text hierarchy (`text-slate-800` headers, `text-slate-600` body, `text-slate-400` muted).
- **Data Schema**: 100% compliance with existing Supabase tables & RPCs (no added or missing fields).

---

### Task 1: Global CSS Light Theme Foundation

**Files:**
- Modify: `app/globals.css:1-27`

**Interfaces:**
- Consumes: Tailwind CSS v4 setup
- Produces: CSS CSS variables for Light Theme background (`#f3f4f6`) and text foreground (`#1e293b`).

- [ ] **Step 1: Update `app/globals.css` base CSS variables**

```css
@import "tailwindcss";

:root {
  --background: #f3f4f6;
  --foreground: #0f172a;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
  min-height: 100vh;
}
```

- [ ] **Step 2: Verify `globals.css` updates**

Run: `npx next lint --file app/globals.css` or check file syntax.
Expected: Clean compilation without CSS errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: configure global light theme variables in globals.css"
```

---

### Task 2: Refactor Main Frame & Left Sidebar (`components/TableMap.tsx`)

**Files:**
- Modify: `components/TableMap.tsx:1-445`

**Interfaces:**
- Consumes: `useAuth` hook, Supabase `tables` query, sub-components (`POSOrderScreen`, `KitchenScreen`, etc.)
- Produces: 2-column layout (Left Sidebar Navigation + Main Canvas Frame for Floor Map & tabs).

- [ ] **Step 1: Update `TableMap.tsx` Left Navigation Sidebar**

Replace dark theme navigation with a clean white sidebar (`w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 shadow-sm`):
- Logo & Brand: YokaYaki Red icon (`UtensilsCrossed`) + "Yokayaki POS" text in `text-slate-900 font-bold`.
- Navigation Buttons:
  - Active Tab: `bg-red-50 text-red-600 font-semibold border-r-4 border-red-600`
  - Inactive Tab: `text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium`
- Footer: Logged-in Staff card (`bg-slate-50 border border-slate-200 rounded-xl p-3`) + Logout button (`text-slate-500 hover:text-red-600 hover:bg-red-50`).

- [ ] **Step 2: Restyle Table Floor Map & Table Action Modal**

- Floor Map Canvas: `bg-gray-100 p-6 min-h-screen`
- Header: Table floor status summary cards (`Vacant`, `Occupied`, `Checking Out`) in `bg-white rounded-xl shadow-sm border border-slate-200`.
- Table Cards Grid:
  - `vacant`: `bg-white border-2 border-slate-200 text-slate-700 hover:border-red-400 hover:shadow-md`
  - `occupied`: `bg-amber-50 border-2 border-amber-400 text-amber-900 shadow-sm`
  - `checking_out`: `bg-emerald-50 border-2 border-emerald-400 text-emerald-900 shadow-sm`
- Table Action Dialog: `bg-white rounded-2xl shadow-xl border border-slate-200` with red action buttons (`bg-red-600 text-white hover:bg-red-700`).

- [ ] **Step 3: Verify TypeScript compilation of `TableMap.tsx`**

Run: `npx tsc --noEmit`
Expected: No type errors in `components/TableMap.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/TableMap.tsx
git commit -m "style(TableMap): update sidebar navigation and table floor map to light theme"
```

---

### Task 3: Redesign POS Order Screen & Cart Sidebar (`components/POSOrderScreen.tsx`)

**Files:**
- Modify: `components/POSOrderScreen.tsx:1-850`

**Interfaces:**
- Consumes: `tableId: number`, `onBack: () => void`, menu items & active orders queries from Supabase.
- Produces: CHILI POS-style 3-column POS layout (Top Search + Category Bar, Menu Cards Grid, Bottom Table Status Chips, Right Cart Panel).

- [ ] **Step 1: Restyle Top Search & Category Pills**

- Search Bar: White input (`bg-white border border-slate-200 rounded-xl shadow-sm text-slate-800 focus:ring-2 focus:ring-red-500 focus:border-red-500`).
- Category Pills: Horizontal scroll list of white badges. Active category badge: `bg-red-600 text-white shadow-sm font-semibold`. Inactive category: `bg-white text-slate-600 border border-slate-200 hover:bg-slate-50`.

- [ ] **Step 2: Restyle Menu Items Grid**

- Grid Layout: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4`.
- Item Card: `bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md p-4 flex flex-col justify-between transition-all`.
- Price: Highlighted in bold YokaYaki Red `text-red-600 text-lg font-bold`.
- Add to Cart Button: `bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 px-3 font-semibold shadow-sm flex items-center justify-center gap-1`.

- [ ] **Step 3: Restyle Right Cart Panel & Order Summary**

- Cart Container: `w-96 bg-white border-l border-slate-200 shadow-sm flex flex-col justify-between p-4`.
- Order Item Rows: Clean white rows (`bg-slate-50 rounded-xl p-3 border border-slate-100 mb-2`). Quantity controls (`-` button in `bg-white text-slate-700 border border-slate-200`, `+` button in `bg-red-600 text-white`).
- Total Amount Display: Large `text-slate-900 font-extrabold text-2xl` with red price tag.
- Customer QR Code Generation button: `border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl py-2.5 font-semibold`.
- Submit Order CTA Button: `bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl py-3.5 shadow-md text-center text-lg w-full`.

- [ ] **Step 4: Add Bottom Active Table Status Bar**

- Quick Table Bar: Fixed horizontal strip at bottom of center area (`bg-white/90 backdrop-blur border-t border-slate-200 p-2 flex gap-2 overflow-x-auto`).
- Active Table Chips: Small pill badges showing active table status e.g. `T1 (4 items)` in `bg-amber-100 text-amber-800 border border-amber-300 rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer hover:bg-amber-200`.

- [ ] **Step 5: Verify TypeScript compilation of `POSOrderScreen.tsx`**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add components/POSOrderScreen.tsx
git commit -m "style(POSOrderScreen): refactor POS order screen to Light Theme and CHILI POS layout"
```

---

### Task 4: Redesign Checkout Screen (`components/CheckoutScreen.tsx`)

**Files:**
- Modify: `components/CheckoutScreen.tsx:1-900`

**Interfaces:**
- Consumes: `tableId: number`, `onBack: () => void`, order items & payment RPC `complete_checkout`.
- Produces: Light Theme checkout modal/screen with white bill summary, member CRM search, promotion selector, and thermal receipt print layout.

- [ ] **Step 1: Restyle Checkout Main Container & Summaries**

- Container: `bg-gray-100 min-h-screen p-6 flex justify-center items-start`.
- Main Card: `bg-white rounded-2xl border border-slate-200 shadow-sm max-w-4xl w-full p-6`.
- Bill Items Table: `bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-4`. Text headers in `text-slate-700 font-bold`.

- [ ] **Step 2: Restyle Member CRM & Promotion Controls**

- Member Search: `bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-red-500`.
- Promotion Cards: Selected promo in `bg-red-50 border-2 border-red-500 text-red-700 font-semibold`, unselected in `bg-white border border-slate-200 text-slate-700`.

- [ ] **Step 3: Restyle Payment Options & Complete Checkout Button**

- Payment Tabs (Cash, PromptPay QR): `bg-white border-2 border-slate-200 hover:border-red-400 text-slate-800 rounded-xl p-4 font-bold flex flex-col items-center gap-2`. Selected state: `border-red-600 bg-red-50 text-red-600`.
- Complete Payment Button: `bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl py-4 shadow-md w-full`.
- Thermal Receipt Print Window: `bg-white text-black p-4 font-mono text-sm border border-slate-300 rounded-lg`.

- [ ] **Step 4: Verify TypeScript compilation of `CheckoutScreen.tsx`**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add components/CheckoutScreen.tsx
git commit -m "style(CheckoutScreen): update checkout and payment UI to Light Theme"
```

---

### Task 5: Redesign KDS Kitchen Screen, Management Views & PIN Pad

**Files:**
- Modify: `components/KitchenScreen.tsx:1-350`
- Modify: `components/StockManager.tsx`, `components/MenuManager.tsx`, `components/PromoManager.tsx`, `components/LoyaltyManager.tsx`, `components/SalesHistory.tsx`, `components/OwnerDashboard.tsx`
- Modify: `components/PinPad.tsx:1-180`

**Interfaces:**
- Consumes: Supabase realtime queries for kitchen, stock, menu, promotions, loyalty, sales, and employee authentication.
- Produces: Uniform Light Theme across all auxiliary and admin views.

- [ ] **Step 1: Restyle KDS Kitchen Screen (`KitchenScreen.tsx`)**

- Container: `bg-gray-100 min-h-screen p-6`.
- Kitchen Order Card: `bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-slate-800`.
- Wait Timer Badge: `< 8 min` in `bg-slate-100 text-slate-700`, `8-15 min` in `bg-amber-100 text-amber-800 border-amber-300`, `> 15 min` in `bg-rose-100 text-rose-800 border-rose-300 animate-pulse`.
- Serve Action Button: `bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-2 px-4 shadow-sm`.

- [ ] **Step 2: Restyle PIN Pad (`PinPad.tsx`)**

- Page Backdrop: `bg-gray-100 min-h-screen flex items-center justify-center p-4`.
- Keypad Card: `bg-white rounded-3xl border border-slate-200 shadow-md p-8 max-w-sm w-full text-center`.
- Header Title: YokaYaki Logo in Red + "กรอก PIN เข้าใช้งาน" in `text-slate-900 font-extrabold text-2xl`.
- Number Keypad Buttons: `bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200/80 text-slate-800 font-bold text-xl rounded-2xl h-16 shadow-xs active:scale-95 transition-all`.
- Active PIN Dots: `bg-red-600` when digit entered, `bg-slate-200` when empty.

- [ ] **Step 3: Restyle Management Screens (`StockManager`, `MenuManager`, `PromoManager`, `LoyaltyManager`, `SalesHistory`, `OwnerDashboard`)**

- Canvas Containers: `bg-gray-100 min-h-screen p-6`.
- Data Tables & Stat Cards: `bg-white rounded-2xl border border-slate-200/80 shadow-sm text-slate-800`.
- Action Buttons (Add, Save, Edit): `bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold py-2.5 px-4 shadow-sm`.

- [ ] **Step 4: Verify TypeScript compilation across all components**

Run: `npx tsc --noEmit`
Expected: Zero TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add components/KitchenScreen.tsx components/PinPad.tsx components/StockManager.tsx components/MenuManager.tsx components/PromoManager.tsx components/LoyaltyManager.tsx components/SalesHistory.tsx components/OwnerDashboard.tsx
git commit -m "style: apply Light Theme styling across KDS kitchen, PIN pad, and owner manager screens"
```

---

### Task 6: Comprehensive Verification & Build Test

**Files:**
- Test all modified components in build mode.

- [ ] **Step 1: Execute Next.js build verification**

Run: `npx next build`
Expected: Production build succeeds with 0 errors.

- [ ] **Step 2: Manual / Dev Server Verification**

Run: `npm run dev` (or `npx next dev`)
Verify:
1. PIN Pad unlocks with Light Theme styling.
2. Left Sidebar displays correctly with YokaYaki branding and tab switching.
3. POS Order Screen displays CHILI POS 3-column layout (Search bar, Category pills, White Menu cards, Bottom Table Chips, Right Order Panel).
4. Checkout Screen shows light thermal receipt and payment methods.
5. KDS Kitchen Screen displays order tickets with wait timers.
