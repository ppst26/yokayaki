# Table Rounded Corners & Reusable Pagination — Design Spec

> **ตำแหน่งไฟล์สเปก:** `docs/superpowers/specs/2026-08-08-table-rounded-and-pagination-design.md`  
> **วันอัปเดตล่าสุด:** 8 สิงหาคม 2569  
> **สถานะ:** ใช้งานบน Production (Active)

---

## 🎯 Overview
Refactor tables and pagination controls across the POS application:
1. Change Table container corners to subtle `rounded-sm` instead of large rounded arcs.
2. Update CustomSelect trigger button style so dropdown buttons stand out distinctly from page backgrounds.
3. Create a reusable `TablePagination` component (`components/ui/pagination.tsx`) with distinct, high-contrast Prev/Next buttons and page size selector.

---

## 📐 Detailed Specifications

### 1. Table Component Update (`components/ui/table.tsx`)
- Container: Change `rounded-t-2xl sm:rounded-t-3xl rounded-b-none` to `rounded-sm border border-slate-200/80 dark:border-neutral-800 shadow-2xs`.
- Table Header: `rounded-t-sm bg-neutral-800 text-white font-black text-[11px]`.

### 2. CustomSelect Trigger Style (`components/ui/select.tsx`)
- Add `triggerClassName` prop to `CustomSelect` allowing custom button styling.
- Default trigger button style: `bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 shadow-2xs text-slate-800 dark:text-neutral-100 hover:bg-slate-50 dark:hover:bg-neutral-800`.

### 3. Reusable TablePagination Component (`components/ui/pagination.tsx`)
- **Location:** `components/ui/pagination.tsx`
- **Props:**
  ```typescript
  interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    pageSizeOptions?: number[];
  }
  ```
- **UI Elements:**
  - Left Side: "แสดงหน้า:" + `CustomSelect` (10, 20, 50 รายการ) + "(ทั้งหมด N รายการ)"
  - Right Side: Prev `<` button + "หน้า X / Y" + Next `>` button
  - **Button Styling:** High contrast white background (`bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 shadow-2xs`), hover state (`hover:bg-red-50 hover:text-red-600 hover:border-red-300`).

---

## 📁 Files Affected
- `components/ui/table.tsx`
- `components/ui/select.tsx`
- `components/ui/pagination.tsx` (NEW)
- `components/menu/MenuManager.tsx`
- `components/loyalty/LoyaltyManager.tsx`
- `components/stock/IngredientPurchaseManager.tsx`
- `components/sales/ClosedBillTable.tsx`
- `components/sales/VoidLogsTable.tsx`
