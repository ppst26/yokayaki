# Design Spec: Modular Component Architecture Refactoring

**Date**: 2026-08-07  
**Goal**: Refactor flat monolithic components in `components/` into a domain/feature-based directory structure with clean sub-components for improved maintainability, testability, and code readability.

---

## 1. Objectives & Architectural Principles

1. **Feature-based Isolation**: Group components into dedicated domain directories (`checkout/`, `order/`, `sales/`, `loyalty/`, `kitchen/`, `menu/`, `promo/`, `stock/`, `dashboard/`, `common/`).
2. **Single Responsibility Principle (SRP)**: Extract large embedded sub-views (modals, forms, cards, summaries) into separate files, keeping top-level container components under 200 lines.
3. **Zero Breaking Changes**: Preserve all existing props, database interactions, Supabase RPC calls, local state flows, and dark theme neutral charcoal styling (`dark:bg-neutral-900`, `dark:bg-neutral-800`).
4. **Incremental Refactoring (Phase by Phase)**: Test compilation (`pnpm run build`) after each phase to guarantee zero regressions.

---

## 2. Target Directory Structure

```
components/
├── common/                     # Shared navigation & layout
│   ├── SidebarNav.tsx          #   Navigation Drawer & Header
│   ├── TableMap.tsx            #   Floor Map & Table Selector
│   ├── ActionSelectorModal.tsx #   Table Action Modal (Order More / Checkout)
│   └── PinPad.tsx              #   PIN Authentication Pad
│
├── checkout/                   # Checkout & Payment Module (Phase 1)
│   ├── CheckoutScreen.tsx      #   Container & Orchestrator
│   ├── OrderSummaryCard.tsx    #   Left column: Order items & subtotal
│   ├── CRMMemberCard.tsx       #   Right column: Member search, register & points
│   ├── CouponInputCard.tsx     #   Right column: Promo coupon code input & badge
│   ├── PaymentCard.tsx         #   Right column: Cash input, quick cash buttons (+100, +500, +1000, Full, Clear) & checkout button
│   ├── PromptPayQRModal.tsx    #   PromptPay QR Modal
│   └── ReceiptPrintView.tsx    #   Receipt component for window.print()
│
├── order/                      # Staff POS Order Module (Phase 2)
│   ├── POSOrderScreen.tsx      #   Container & Orchestrator
│   ├── MenuGrid.tsx            #   Category tabs & menu cards
│   ├── CartPanel.tsx           #   Sticky bottom mobile / right desktop cart panel
│   └── SpecialNoteModal.tsx    #   Special note modal
│
├── sales/                      # Sales & Audit History (Phase 3)
│   ├── SalesHistory.tsx        #   Container
│   ├── SalesSummaryCards.tsx   #   4 KPI summary cards
│   ├── ClosedBillTable.tsx     #   Closed bills table
│   ├── VoidLogsTable.tsx       #   Void logs table
│   └── BillDetailModal.tsx     #   Detailed bill modal (Items + CRM Member + Coupon Code)
│
├── loyalty/                    # Loyalty CRM (Phase 3)
│   ├── LoyaltyManager.tsx      #   Container
│   ├── MemberInfoCard.tsx      #   Minimal single member card
│   └── PointsHistoryModal.tsx  #   Manual points adjustment log modal
│
├── kitchen/                    # Kitchen Display System (Phase 4)
│   ├── KitchenScreen.tsx       #   Container
│   └── KitchenOrderCard.tsx    #   Table KDS card + timer
│
├── menu/                       # Menu CRUD Management (Phase 4)
│   ├── MenuManager.tsx         #   Container
│   └── MenuItemModal.tsx       #   Add/Edit menu modal
│
├── promo/                      # Promotions Management (Phase 4)
│   ├── PromoManager.tsx        #   Container
│   └── PromoModal.tsx          #   Add/Edit promo modal ("คูปองส่วนลด")
│
├── stock/                      # Stock & Ingredients (Phase 4)
│   ├── StockManager.tsx        #   Container
│   └── StockLogModal.tsx       #   Stock adjustment modal
│
└── dashboard/                  # Owner Dashboard (Phase 4)
    ├── OwnerDashboard.tsx      #   Container
    └── AnalyticsCharts.tsx     #   Revenue charts & analytics
```

---

## 3. Detailed Component Decomposition

### Phase 1: `checkout/` Module
- **`CheckoutScreen.tsx`**: State owner (`orderId`, `orderedItems`, `member`, `pointsToRedeem`, `cashReceived`, `couponApplied`, `isProcessing`). Coordinates child components.
- **`OrderSummaryCard.tsx`**: Props: `activeItems`, `subtotal`, `appliedPromos`, `loyaltyDiscount`, `netAmount`, `pointsEarned`, `member`.
- **`CRMMemberCard.tsx`**: Props: `phoneInput`, `setPhoneInput`, `member`, `isSearchingMember`, `searchMember`, `pointsToRedeem`, `setPointsToRedeem`, `showRegister`, `registerName`, `setRegisterName`, `registerMember`, `subtotal`.
- **`CouponInputCard.tsx`**: Props: `couponApplied`, `couponInput`, `setCouponInput`, `couponError`, `setCouponError`, `applyCoupon`, `removeCoupon`.
- **`PaymentCard.tsx`**: Props: `cashReceived`, `setCashReceived`, `cashNum`, `changeAmount`, `transferAmount`, `netAmount`, `pendingItemsCount`, `setShowQrModal`, `processPayment`, `isProcessing`.
- **`PromptPayQRModal.tsx`**: Props: `showQrModal`, `setShowQrModal`, `transferAmount`, `promptPayId`.
- **`ReceiptPrintView.tsx`**: Props: `orderId`, `tableId`, `now`, `employee`, `activeItems`, `subtotal`, `appliedPromos`, `loyaltyDiscount`, `netAmount`, `cashNum`, `transferAmount`, `changeAmount`, `member`, `pointsToRedeem`, `pointsEarned`, `onBack`.

---

## 4. Verification Plan

### Automated Build Verification
- Execute `pnpm run build` after each phase.
- Ensure 0 TypeScript errors and clean Next.js static generation.

### Functional Verification
- Verify checkout flow: cash quick buttons (`+100`, `+500`, `+1000`), clear button, member points discount, coupon code, PromptPay QR modal, print receipt.
- Verify kitchen pending items checkout restriction in TableMap and CheckoutScreen.
