# Full-Width Layout Expansion Design

**Date**: 2026-07-23  
**Status**: Proposed  

## 1. Goal & Context
The user requested that all pages/tabs in theYokazaki POS system expand to fill the **full width** of the content stage, **EXCEPT** for the Floor Map (แผนผังโต๊ะ) view which should retain a max-width layout constraint to prevent table cards from stretching unnaturally on wide screens.

---

## 2. Component Layout Strategy

### A. Main App Container (`components/TableMap.tsx`)
- Modify the main content container:
  - **Before**: `<main className="flex-1 p-6 overflow-y-auto max-w-7xl">`
  - **After**: `<main className="flex-1 p-6 overflow-y-auto w-full">`
- Constrain Floor Map View (`activeTab === 'floor'`):
  - Wrap the Floor Map legend and table grid in `<div className="max-w-6xl">` so table cards remain balanced and readable.

### B. Page/Tab Components (Full Width Expansion)
1. **Owner Dashboard (`components/OwnerDashboard.tsx`)**:
   - Remove `<div className="max-w-6xl mx-auto space-y-8">` → Change to `<div className="space-y-8 font-sans w-full">`.
   - Metric cards grid, adaptive chart, top sellers, and void summary will expand across the entire main content area.
2. **Sales History (`components/SalesHistory.tsx`)**:
   - Remove `<div className="max-w-5xl mx-auto space-y-6">` → Change to `<div className="space-y-6 font-sans w-full">`.
   - Summary stat cards, bill list table, and void log table will expand full width.
3. **Loyalty CRM (`components/LoyaltyManager.tsx`)**:
   - Remove `<div className="max-w-5xl mx-auto space-y-6">` → Change to `<div className="space-y-6 font-sans w-full">`.
   - Member summary cards and member list table will expand full width.
4. **Kitchen Screen KDS (`components/KitchenScreen.tsx`)**:
   - Ensures grid fills available width.
5. **Menu Manager, Stock Manager, Promo Manager**:
   - Ensure main wrapper containers are set to `w-full` without max-width caps.

---

## 3. Verification Plan
- Run `npx tsc --noEmit` to ensure zero TypeScript errors.
- Run `npx next build` to verify production build compilation.
