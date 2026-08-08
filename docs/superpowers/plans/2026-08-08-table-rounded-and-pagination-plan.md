# Table Rounded Corners & Reusable Pagination — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update table container corners to `rounded-sm`, add trigger styling support to `CustomSelect`, create reusable `TablePagination` component, and apply to all table managers.

**Architecture:**
1. Modify `components/ui/table.tsx` (`rounded-sm` container & header).
2. Modify `components/ui/select.tsx` (`triggerClassName` prop & default white/border trigger).
3. Create `components/ui/pagination.tsx` (`TablePagination` component).
4. Update `MenuManager.tsx`, `LoyaltyManager.tsx`, `IngredientPurchaseManager.tsx`, `ClosedBillTable.tsx`, `VoidLogsTable.tsx`.

---

### Task 1: Update Table UI & CustomSelect Trigger

**Files:**
- Modify: `components/ui/table.tsx`
- Modify: `components/ui/select.tsx`

- [ ] **Step 1: Update Table container in `components/ui/table.tsx`**
  Change container classes to `rounded-sm border border-slate-200/80 dark:border-neutral-800 shadow-2xs`.

- [ ] **Step 2: Add triggerClassName to `CustomSelect` in `components/ui/select.tsx`**
  Allow custom trigger button styling and default to distinct white/border background.

---

### Task 2: Create Reusable TablePagination Component

**Files:**
- Create: `components/ui/pagination.tsx`

- [ ] **Step 1: Create TablePagination component**
  Implement `TablePagination` with distinct page size dropdown and high-contrast Prev/Next buttons.

---

### Task 3: Apply TablePagination to Managers

**Files:**
- Modify: `components/menu/MenuManager.tsx`
- Modify: `components/loyalty/LoyaltyManager.tsx`

- [ ] **Step 1: Update MenuManager.tsx to use TablePagination**
- [ ] **Step 2: Update LoyaltyManager.tsx to use TablePagination**

---

### Task 4: Verify and Commit

- [ ] **Step 1: Run `npx tsc --noEmit` to verify type safety**
- [ ] **Step 2: Commit all changes**
