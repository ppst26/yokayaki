# Responsive Mobile Layout for Ingredient Order Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ingredient list rows inside `IngredientPurchaseManager` modal fully responsive on mobile screens (< 640px) using a 2-line stacked card layout to prevent horizontal overflow.

**Architecture:** Use Tailwind CSS responsive utilities (`sm:`) on `IngredientPurchaseManager.tsx`. On mobile screens (< 640px), ingredient items render as a 2-line card layout (Line 1: Full-width Name dropdown + Delete button, Line 2: 3-column grid for Quantity, Unit dropdown, and Price per Unit). On desktop screens (≥ 640px), the layout automatically switches to the 5-column single-line table grid.

**Tech Stack:** React 19, Next.js 16, TailwindCSS 4, Lucide React icons.

## Global Constraints
- Target File: `components/stock/IngredientPurchaseManager.tsx`
- Maintain existing dropdown and input change handlers (`updateRow`, `removeIngredientRow`, `onAddNew`).
- Strict TypeScript validation (`npx tsc --noEmit`).

---

### Task 1: Update Ingredient Row Layout to be Responsive

**Files:**
- Modify: `components/stock/IngredientPurchaseManager.tsx`

**Interfaces:**
- Consumes: `NewIngredientRow`, `CustomSelect`, `updateRow`, `removeIngredientRow`
- Produces: Responsive 2-line card layout on mobile (`< 640px`), 5-column table row on desktop (`≥ 640px`)

- [ ] **Step 1: Update Modal Column Headers Visibility**

Hide the 5-column header text grid on mobile (`hidden sm:grid`) so headers only display on desktop screens.

- [ ] **Step 2: Update Ingredient Item Row Layout**

Refactor the JSX map inside `ingredients.map((row, idx) => ...)`:
1. Container: `bg-zinc-50 dark:bg-zinc-800/40 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-zinc-100 dark:border-zinc-800/80 sm:border-none space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_80px_100px_90px_32px] sm:gap-2 sm:items-center relative`
2. Line 1 (Name + Mobile Trash button):
   - Wrap Name `CustomSelect` and mobile trash button in `<div className="flex items-center gap-2 sm:contents">`
3. Line 2 (Quantity, Unit, Price per unit, Desktop Trash button):
   - Wrap in `<div className="grid grid-cols-3 gap-2 sm:contents">` with mini labels for mobile view (`<span className="block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 mb-1 sm:hidden">`).

- [ ] **Step 3: Verify TypeScript Build**

Run `npx tsc --noEmit` to verify zero compiler errors.

- [ ] **Step 4: Commit Changes**

Commit the responsive UI layout changes to git.
