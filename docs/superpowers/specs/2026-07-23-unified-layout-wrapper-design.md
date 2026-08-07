# Unified App Layout Strategy Design

**Date**: 2026-07-23  
**Status**: Proposed  

## 1. Goal
Ensure the `SidebarNav` navigation layout (Mobile Sticky Header + Mobile SlideOver Drawer + Desktop Left Sidebar) is consistently present across **ALL views** in the POS system—including **POS Order Screen** (`POSOrderScreen.tsx`) and **Checkout Screen** (`CheckoutScreen.tsx`).

---

## 2. Architecture & Design

### A. Layout Integration in `TableMap.tsx`
Remove early `if (selectedTableId !== null)` and `if (checkoutTableId !== null)` returns.

Wrap all view states (`Floor Map`, `POS Order`, `Checkout`, `Kitchen KDS`, `Sales History`, `Menu Manager`, `Stock Manager`, `Promo Manager`, `Dashboard`, `Loyalty CRM`) within a single unified layout structure:

```tsx
<div className="min-h-screen bg-gray-100 text-slate-800 flex flex-col md:flex-row font-sans">
  <SidebarNav activeTab={activeTab} onSelectTab={handleTabChange} />

  <main className="flex-1 p-6 overflow-y-auto w-full">
    {selectedTableId !== null ? (
      <POSOrderScreen tableId={selectedTableId} onBack={() => setSelectedTableId(null)} />
    ) : checkoutTableId !== null ? (
      <CheckoutScreen tableId={checkoutTableId} onBack={() => { setCheckoutTableId(null); fetchTables(); }} />
    ) : (
      /* Tab Content Rendering */
    )}
  </main>
</div>
```

### B. Tab Selection Handler (`handleTabChange`)
When any tab on `SidebarNav` is clicked:
- Clear active table modes (`setSelectedTableId(null)`, `setCheckoutTableId(null)`).
- Update `activeTab` to the requested tab.

### C. Component Inner Layout Cleanups
- **`POSOrderScreen.tsx`**: Update top wrapper from `min-h-screen` to `w-full` to fit inside the main stage seamlessly.
- **`CheckoutScreen.tsx`**: Update top wrapper from `min-h-screen` to `w-full` to fit inside the main stage seamlessly.

---

## 3. Verification Plan
- Run `npx tsc --noEmit` to verify type safety.
- Run `npx next build` to verify production compilation.
