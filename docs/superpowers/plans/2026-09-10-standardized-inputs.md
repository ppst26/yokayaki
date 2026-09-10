# Standardized Inputs & Dropdowns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize search inputs and select/dropdown controls to a unified `rounded-xl` shape, `h-10` (40px) height, and high-contrast styling across all YOKAYAKI POS pages.

**Architecture:** Create a reusable `SearchInput` component in `components/ui/search-input.tsx` and upgrade `CustomSelect` in `components/ui/select.tsx` to support `prefixLabel` and standardized high-contrast trigger styling. Refactor `MenuManager`, `IngredientPurchaseManager`, `LoyaltyManager`, and `DateFilterBar` to adopt the new standard.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, TailwindCSS v4, Lucide React icons.

## Global Constraints

- Use `pnpm` exclusively (never npm or yarn).
- Maintain existing RBAC boundaries and server/client boundaries (`"use client"` on interactive components).
- Do NOT import `@/lib/supabase` into customer QR bundle.
- Maintain responsive behavior across desktop and iPad viewports.
- All interactive elements must maintain clear contrast in both Light Theme and Dark Theme.

---

### Task 1: Create Standardized `SearchInput` Component

**Files:**
- Create: `components/ui/search-input.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onClear?: () => void;
    autoFocus?: boolean;
    id?: string;
  }
  export const SearchInput: React.FC<SearchInputProps>;
  ```

- [ ] **Step 1: Write `components/ui/search-input.tsx`**

```tsx
"use client";

import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onClear?: () => void;
  autoFocus?: boolean;
  id?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'ค้นหา...',
  className = '',
  disabled = false,
  onClear,
  autoFocus = false,
  id,
}) => {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div
      className={`relative flex items-center h-10 rounded-xl border border-slate-300 hover:border-slate-400 dark:border-zinc-700/80 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800/90 shadow-xs transition duration-150 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 dark:focus-within:border-red-500/80 ${
        disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-zinc-800/50' : ''
      } ${className}`}
    >
      <Search className="w-4 h-4 text-slate-400 dark:text-zinc-400 shrink-0 ml-3.5 pointer-events-none" />
      <input
        id={id}
        type="text"
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-full bg-transparent pl-2.5 pr-9 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none border-none"
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="ล้างการค้นหา"
          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer rounded-full transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verify type check**

Run: `pnpm typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/search-input.tsx
git commit -m "feat(ui): add standardized SearchInput component"
```

---

### Task 2: Upgrade `CustomSelect` Component

**Files:**
- Modify: `components/ui/select.tsx`

**Interfaces:**
- Consumes: Existing `CustomSelectProps`
- Produces: Enhanced `CustomSelectProps` with `prefixLabel?: string`, unified trigger styling (`h-10 rounded-xl`), and upgraded popover contrast.

- [ ] **Step 1: Update `components/ui/select.tsx`**

Add `prefixLabel?: string` to `CustomSelectProps` and update the trigger button:
```tsx
export interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  addNewLabel?: string;
  onAddNew?: () => void;
  searchable?: boolean;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  menuAnchorRef?: React.RefObject<HTMLElement | null>;
  menuMinWidth?: number;
  icon?: React.ReactNode;
  /** ป้ายชื่อหัวข้อด้านหน้า เช่น "สต็อก:", "จัดเรียง:", "HH:" */
  prefixLabel?: string;
}
```

Update trigger styling and prefix label rendering:
```tsx
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={
          triggerClassName ||
          `w-full h-10 bg-white dark:bg-zinc-800/90 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl px-3.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 border border-slate-300 hover:border-slate-400 dark:border-zinc-700/80 dark:hover:border-zinc-600 shadow-xs transition duration-150 flex items-center justify-between cursor-pointer gap-2 ${
            disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-zinc-800/50' : ''
          } ${isOpen ? 'border-red-500 ring-2 ring-red-500/20' : ''}`
        }
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {icon}
          {prefixLabel && (
            <span className="shrink-0 text-xs font-extrabold text-slate-500 dark:text-zinc-400">
              {prefixLabel}
            </span>
          )}
          <span className={`truncate text-left ${!value ? 'text-slate-400 dark:text-zinc-500 font-normal' : ''}`}>
            {displayLabel || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-red-500' : ''
          }`}
        />
      </button>
```

Update Popover styling for high contrast in Dark and Light mode:
- Popover container: `bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col`
- Popover search input wrapper: `bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg`
- Popover options list divider: `divide-y divide-slate-100 dark:divide-zinc-800/60`
- Unselected option hover: `text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/80`
- Selected option: `bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold`

- [ ] **Step 2: Verify type check**

Run: `pnpm typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/select.tsx
git commit -m "feat(ui): upgrade CustomSelect with prefixLabel and high-contrast trigger"
```

---

### Task 3: Refactor `MenuManager.tsx` to Use Standardized Search & Dropdowns

**Files:**
- Modify: `components/menu/MenuManager.tsx:390-465`

**Interfaces:**
- Consumes: `SearchInput` from `@/components/ui/search-input`, `CustomSelect` from `@/components/ui/select`

- [ ] **Step 1: Update `MenuManager.tsx` imports and filter row**

Import `SearchInput`:
```tsx
import { SearchInput } from '@/components/ui/search-input';
```

Replace Row 1 (lines 390-465):
- Remove the old custom search `<div>` and replace with `<SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="ค้นหาชื่อเมนู..." className="w-full sm:w-60 min-w-[180px]" />`
- Remove the outer pill wrapper `<div>` tags around the 4 filters (`stockFilterAnchorRef`, `sortFilterAnchorRef`, `happyHourFilterAnchorRef`, `imageFilterAnchorRef`).
- Render `<CustomSelect prefixLabel="สต็อก:" value={filterStock} onChange={val => setFilterStock(val as StockFilter)} options={STOCK_FILTER_OPTIONS} searchable={false} className="w-auto min-w-[130px]" />`
- Render `<CustomSelect prefixLabel="จัดเรียง:" value={sortBy} onChange={val => setSortBy(val as SortOption)} options={SORT_OPTIONS} searchable={false} className="w-auto min-w-[155px]" />`
- Render `<CustomSelect prefixLabel="HH:" value={filterHappyHour} onChange={val => setFilterHappyHour(val as HappyHourFilter)} options={HAPPY_HOUR_FILTER_OPTIONS} searchable={false} className="w-auto min-w-[115px]" />`
- Render `<CustomSelect prefixLabel="รูป:" value={filterImage} onChange={val => setFilterImage(val as ImageFilter)} options={IMAGE_FILTER_OPTIONS} searchable={false} className="w-auto min-w-[115px]" />`
- Clean up unused `useRef` hooks (`stockFilterAnchorRef`, `sortFilterAnchorRef`, `happyHourFilterAnchorRef`, `imageFilterAnchorRef`).

- [ ] **Step 2: Verify type check**

Run: `pnpm typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/menu/MenuManager.tsx
git commit -m "refactor(menu): standardize search input and filter dropdowns in MenuManager"
```

---

### Task 4: Refactor `IngredientPurchaseManager.tsx` (Stock) to Use Standardized Search & Dropdown

**Files:**
- Modify: `components/stock/IngredientPurchaseManager.tsx:500-534`

**Interfaces:**
- Consumes: `SearchInput` from `@/components/ui/search-input`, `CustomSelect` from `@/components/ui/select`

- [ ] **Step 1: Update `IngredientPurchaseManager.tsx`**

Import `SearchInput`:
```tsx
import { SearchInput } from '@/components/ui/search-input';
```

Replace search and date filter row (lines 500-534):
- Replace lines 501-520 with:
  `<SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="ค้นหา PO# หรือชื่อผู้สั่งซื้อ" className="flex-1 min-w-[200px]" />`
- Update lines 523-532 for date filter:
  Remove custom `triggerClassName` override from `CustomSelect` so it inherits the standardized `h-10 rounded-xl` trigger styling:
  ```tsx
  <div className="w-[180px] sm:w-[220px] shrink-0">
    <CustomSelect
      value={dateFilter}
      onChange={val => setDateFilter(val as DateFilterType)}
      options={DATE_FILTER_OPTIONS}
      icon={<Calendar className="w-4 h-4 text-slate-400 dark:text-zinc-400 shrink-0" />}
      searchable={false}
    />
  </div>
  ```

- [ ] **Step 2: Verify type check**

Run: `pnpm typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/stock/IngredientPurchaseManager.tsx
git commit -m "refactor(stock): standardize search and date filter in IngredientPurchaseManager"
```

---

### Task 5: Refactor `LoyaltyManager.tsx` to Use Standardized Search & Dropdowns

**Files:**
- Modify: `components/loyalty/LoyaltyManager.tsx:530-595`

**Interfaces:**
- Consumes: `SearchInput` from `@/components/ui/search-input`, `CustomSelect` from `@/components/ui/select`

- [ ] **Step 1: Update `LoyaltyManager.tsx`**

Import `SearchInput`:
```tsx
import { SearchInput } from '@/components/ui/search-input';
```

Update Search and filter dropdowns (lines 530-595):
- Replace lines 533-551 with:
  `<SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="ค้นหาชื่อหรือเบอร์โทร..." className="flex-1 min-w-[200px]" />`
- Update mobile export button next to search to match `h-10 rounded-xl border border-slate-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/90`.
- Verify `dormantDaysMin`, `tagFilter`, and `rfmFilter` `CustomSelect` instances inherit the new default trigger with `h-10 rounded-xl`.

- [ ] **Step 2: Verify type check**

Run: `pnpm typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/loyalty/LoyaltyManager.tsx
git commit -m "refactor(loyalty): standardize search and filter dropdowns in LoyaltyManager"
```

---

### Task 6: Align `DateFilterBar.tsx` Trigger Styling

**Files:**
- Modify: `components/dashboard/DateFilterBar.tsx:535-565`

- [ ] **Step 1: Update triggers in `DateFilterBar.tsx`**

Align the Select trigger button and Custom Date trigger button:
- Update preset trigger:
  ```tsx
  className="h-10 px-3.5 bg-white dark:bg-zinc-800/90 border border-slate-300 hover:border-slate-400 dark:border-zinc-700/80 dark:hover:border-zinc-600 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-100 flex items-center justify-between gap-2.5 transition shadow-xs cursor-pointer shrink-0 min-w-[170px]"
  ```
- Update custom range button:
  ```tsx
  className={`h-10 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer shrink-0 ${
    isRangePickerOpen || datePreset === 'custom'
      ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold ring-2 ring-red-500/20'
      : 'border-slate-300 bg-white hover:border-slate-400 text-slate-800 dark:border-zinc-700/80 dark:bg-zinc-800/90 dark:hover:border-zinc-600 dark:text-zinc-100'
  }`}
  ```

- [ ] **Step 2: Verify type check**

Run: `pnpm typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DateFilterBar.tsx
git commit -m "style(dashboard): align DateFilterBar triggers with input standards"
```

---

### Task 7: Full System Verification & Build Validation

**Files:**
- Readonly verification across the codebase.

- [ ] **Step 1: Run TypeScript type check**

Run: `pnpm typecheck`
Expected: `Exit 0` with zero diagnostic errors.

- [ ] **Step 2: Run unit tests**

Run: `pnpm test:unit`
Expected: All unit tests PASS.

- [ ] **Step 3: Run Next.js build**

Run: `pnpm build`
Expected: Compiled successfully with zero route errors.
