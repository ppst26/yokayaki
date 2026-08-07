# Component Architecture Refactoring (Incremental) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor flat monolithic components in `components/` into domain-specific subdirectories (`checkout/`, `order/`, `sales/`, `loyalty/`, etc.) with modular sub-components for improved code readability and maintainability.

**Architecture:** Incrementally extract sub-views (Cards, Modals, Summary Boxes, Forms) into focused feature sub-folders while keeping props, state ownership, dark theme styling (`dark:bg-neutral-900`, `dark:bg-neutral-800`), and Supabase integrations intact.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict mode, TailwindCSS v4, Lucide React, pnpm.

## Global Constraints

- **Dark Theme Palette**: `dark:bg-neutral-950` for main background, `dark:bg-neutral-900` for cards/nav, `dark:bg-neutral-800` for inputs/modals/buttons.
- **Zero Breaking Changes**: Existing container prop signatures and Supabase RPC calls must remain 100% functional.
- **Build Cleanliness**: Each task must pass `pnpm run build` with 0 TypeScript/compilation errors.

---

### Task 1: Refactor `checkout/` Module (Phase 1)

**Files:**
- Create: `components/checkout/OrderSummaryCard.tsx`
- Create: `components/checkout/CRMMemberCard.tsx`
- Create: `components/checkout/CouponInputCard.tsx`
- Create: `components/checkout/PaymentCard.tsx`
- Create: `components/checkout/PromptPayQRModal.tsx`
- Create: `components/checkout/ReceiptPrintView.tsx`
- Create: `components/checkout/CheckoutScreen.tsx`
- Modify: `components/CheckoutScreen.tsx` (re-export or alias wrapper)

**Interfaces:**
- Consumes: `OrderedItem`, `AppliedPromo`, `LoyaltyMember`, `Promotion` from `@/components/CheckoutScreen`
- Produces: Clean modular checkout component tree inside `components/checkout/`

- [ ] **Step 1: Create `components/checkout/OrderSummaryCard.tsx`**

Extract the order summary list, subtotal, promo discounts, and earned points box.

- [ ] **Step 2: Create `components/checkout/CRMMemberCard.tsx`**

Extract member CRM lookup input, member balance badge, points redemption input, and new member registration box.

- [ ] **Step 3: Create `components/checkout/CouponInputCard.tsx`**

Extract promo coupon code input, apply button, error display, and applied coupon badge.

- [ ] **Step 4: Create `components/checkout/PaymentCard.tsx`**

Extract cash input, quick cash buttons (`+100`, `+500`, `+1000`, `เต็มจำนวน`, `ล้าง`), change/transfer calculation, PromptPay QR button, and payment confirmation button (with kitchen pending order check).

- [ ] **Step 5: Create `components/checkout/PromptPayQRModal.tsx` and `ReceiptPrintView.tsx`**

Extract the PromptPay QR Modal and Thermal 80mm printable receipt component.

- [ ] **Step 6: Assemble `components/checkout/CheckoutScreen.tsx` and update root export**

Wire all sub-components together inside `components/checkout/CheckoutScreen.tsx` and update `components/CheckoutScreen.tsx` to re-export it.

- [ ] **Step 7: Verify Build**

Run: `pnpm run build`  
Expected: PASS with 0 compilation errors.

---

### Task 2: Refactor `order/` Module (Phase 2)

**Files:**
- Create: `components/order/MenuGrid.tsx`
- Create: `components/order/CartPanel.tsx`
- Create: `components/order/SpecialNoteModal.tsx`
- Create: `components/order/POSOrderScreen.tsx`
- Modify: `components/POSOrderScreen.tsx` (re-export wrapper)

**Interfaces:**
- Consumes: `MenuItem`, `CartItem`, `Category` from `@/components/POSOrderScreen`
- Produces: Modular order component tree inside `components/order/`

- [ ] **Step 1: Create `components/order/MenuGrid.tsx`**

Extract search bar, category filter pills, and menu item grid.

- [ ] **Step 2: Create `components/order/CartPanel.tsx`**

Extract mobile fixed viewport bottom cart / desktop right cart sidebar with accordion toggle, quantity adjustment buttons, special note triggers, and send-to-kitchen button.

- [ ] **Step 3: Create `components/order/SpecialNoteModal.tsx`**

Extract the special note editing modal.

- [ ] **Step 4: Assemble `components/order/POSOrderScreen.tsx` & update root export**

Wire menu grid, cart panel, and note modal inside `components/order/POSOrderScreen.tsx`. Update `components/POSOrderScreen.tsx` to re-export it.

- [ ] **Step 5: Verify Build**

Run: `pnpm run build`  
Expected: PASS with 0 compilation errors.

---

### Task 3: Refactor `sales/` & `loyalty/` Modules (Phase 3)

**Files:**
- Create: `components/sales/SalesSummaryCards.tsx`
- Create: `components/sales/ClosedBillTable.tsx`
- Create: `components/sales/VoidLogsTable.tsx`
- Create: `components/sales/BillDetailModal.tsx`
- Create: `components/sales/SalesHistory.tsx`
- Create: `components/loyalty/MemberInfoCard.tsx`
- Create: `components/loyalty/PointsHistoryModal.tsx`
- Create: `components/loyalty/LoyaltyManager.tsx`

- [ ] **Step 1: Extract `components/sales/` sub-components and modal**

Separate KPI summary cards, closed bills table, void logs table, and detailed bill modal (with CRM member card & coupon code badge).

- [ ] **Step 2: Extract `components/loyalty/` sub-components**

Separate minimal single member card, points adjustment modal, and points audit log table.

- [ ] **Step 3: Verify Build**

Run: `pnpm run build`  
Expected: PASS with 0 compilation errors.

---

### Task 4: Refactor Remaining Management Screens (Phase 4)

**Files:**
- Create: `components/kitchen/KitchenScreen.tsx` & `KitchenOrderCard.tsx`
- Create: `components/menu/MenuManager.tsx` & `MenuItemModal.tsx`
- Create: `components/promo/PromoManager.tsx` & `PromoModal.tsx`
- Create: `components/stock/StockManager.tsx` & `StockLogModal.tsx`
- Create: `components/dashboard/OwnerDashboard.tsx` & `AnalyticsCards.tsx`
- Create: `components/common/SidebarNav.tsx`, `TableMap.tsx`, `PinPad.tsx`

- [ ] **Step 1: Organize remaining screens into domain subdirectories**

Move and structure kitchen, menu, promo, stock, dashboard, and common UI components.

- [ ] **Step 2: Final Build Verification**

Run: `pnpm run build`  
Expected: PASS with 0 compilation errors.
