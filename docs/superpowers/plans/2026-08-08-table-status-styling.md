# Table Status Visual Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update table card styling in `TableCard.tsx` so vacant tables are white, occupied tables have a yellow-to-orange gradient, and checking_out tables have a flashing red gradient with a bell icon badge. Ensure `TableMap.tsx` correctly handles table click interactions for checking_out status.

**Architecture:** Update `TableCard.tsx` logic to evaluate `table.status` (`'vacant'`, `'occupied'`, `'checking_out'`) to apply respective background gradients, badge text/icons, and action text. Update `handleTableClick` in `TableMap.tsx` to handle `'checking_out'` along with `'occupied'`.

**Tech Stack:** React 19, Next.js 16, TailwindCSS 4, Lucide React (`ShoppingBag`, `Receipt`, `BellRing`).

## Global Constraints

- Tech stack: Next.js 16, TailwindCSS 4, Lucide React, pnpm
- Status styles:
  - `vacant`: White background (`bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800`), green badge `ว่าง (VACANT)`, text `เปิดออเดอร์ใหม่`
  - `occupied`: Yellow-to-orange gradient (`bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-white`), badge `มีลูกค้า`, text `จัดการออเดอร์`
  - `checking_out`: Red gradient (`bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-xl shadow-red-600/40 animate-pulse ring-4 ring-red-400/50`), badge `🔔 เรียกเช็คบิล`, text `เช็คบิล / ชำระเงิน`

---

### Task 1: Update TableCard Component Styling

**Files:**
- Modify: `components/common/TableCard.tsx:1-66`

**Interfaces:**
- Consumes: `table: Table` (`id: number`, `status: 'vacant' | 'occupied' | 'checking_out'`)
- Produces: Visual UI component with distinct vacant, occupied, and checking_out styles.

- [ ] **Step 1: Inspect and update status evaluation in `TableCard.tsx`**

Modify `components/common/TableCard.tsx` to check all 3 statuses:

```tsx
"use client";

import React from 'react';
import { ShoppingBag, Receipt, BellRing } from 'lucide-react';

export interface Table {
  id: number;
  status: 'vacant' | 'occupied' | 'checking_out';
  updated_at?: string;
}

interface TableCardProps {
  table: Table;
  onClick: () => void;
  className?: string;
}

export const TableCard: React.FC<TableCardProps> = ({ table, onClick, className = '' }) => {
  const isOccupied = table.status === 'occupied';
  const isCheckingOut = table.status === 'checking_out';

  // Card Background & Ring Styling
  const getCardStyle = () => {
    if (isCheckingOut) {
      return 'bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-xl shadow-red-600/40 animate-pulse ring-4 ring-red-400/50 border-transparent';
    }
    if (isOccupied) {
      return 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 border-transparent';
    }
    return 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700';
  };

  // Status Badge Styling & Text
  const renderBadge = () => {
    if (isCheckingOut) {
      return (
        <span className="bg-white/30 backdrop-blur-xs text-white border border-white/40 text-[9px] sm:text-[10px] font-extrabold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider shrink-0 self-start sm:self-auto flex items-center gap-1">
          <BellRing className="w-3 h-3 animate-bounce" />
          <span>เรียกเช็คบิล</span>
        </span>
      );
    }
    if (isOccupied) {
      return (
        <span className="bg-white/20 backdrop-blur-xs text-white border border-white/30 text-[9px] sm:text-[10px] font-extrabold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider shrink-0 self-start sm:self-auto">
          มีลูกค้า
        </span>
      );
    }
    return (
      <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 text-[9px] sm:text-[10px] font-extrabold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider shrink-0 self-start sm:self-auto">
        ว่าง (Vacant)
      </span>
    );
  };

  // Action Footer Text & Icon
  const getActionInfo = () => {
    if (isCheckingOut) {
      return {
        label: 'เช็คบิล / ชำระเงิน',
        icon: <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
        labelColor: 'text-red-100 font-extrabold',
        iconContainer: 'bg-white/20 text-white',
        border: 'border-white/20'
      };
    }
    if (isOccupied) {
      return {
        label: 'จัดการออเดอร์',
        icon: <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
        labelColor: 'text-amber-100 font-extrabold',
        iconContainer: 'bg-white/20 text-white',
        border: 'border-white/20'
      };
    }
    return {
      label: 'เปิดออเดอร์ใหม่',
      icon: <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
      labelColor: 'text-slate-500 dark:text-neutral-400',
      iconContainer: 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 group-hover:bg-amber-500 group-hover:text-white',
      border: 'border-slate-100 dark:border-neutral-800/80'
    };
  };

  const actionInfo = getActionInfo();

  return (
    <button
      onClick={onClick}
      className={`group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl transition duration-200 text-left flex flex-col justify-between h-40 sm:h-48 cursor-pointer active:scale-95 overflow-hidden ${getCardStyle()} ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
        <span className={`text-lg sm:text-2xl font-black ${isOccupied || isCheckingOut ? 'text-white' : 'text-slate-900 dark:text-neutral-100'}`}>
          โต๊ะ {table.id}
        </span>
        {renderBadge()}
      </div>

      <div className={`flex items-center justify-between pt-2 sm:pt-4 border-t ${actionInfo.border}`}>
        <span className={`text-[11px] sm:text-xs font-bold line-clamp-1 ${actionInfo.labelColor}`}>
          {actionInfo.label}
        </span>
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition shrink-0 ${actionInfo.iconContainer}`}>
          {actionInfo.icon}
        </div>
      </div>
    </button>
  );
};
```

- [ ] **Step 2: Verify `TableCard.tsx` builds cleanly**

Run: `pnpm exec tsc --noEmit`
Expected: No TypeScript errors in `components/common/TableCard.tsx`.

---

### Task 2: Update TableMap Table Click Handling

**Files:**
- Modify: `components/common/TableMap.tsx:170-176`

**Interfaces:**
- Consumes: `handleTableClick(table: Table)`
- Behavior: If table status is `'occupied'` or `'checking_out'`, show action selector modal (`setActionSelectorTable(table.id)`). Otherwise, open POS order screen (`setSelectedTableId(table.id)`).

- [ ] **Step 1: Update `handleTableClick` in `TableMap.tsx`**

Modify `components/common/TableMap.tsx` lines 170-176 to:

```tsx
  const handleTableClick = (table: Table) => {
    if (table.status === 'occupied' || table.status === 'checking_out') {
      setActionSelectorTable(table.id);
    } else {
      setSelectedTableId(table.id);
    }
  };
```

- [ ] **Step 2: Run typecheck and dev server verification**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

---

### Task 3: Build Verification

- [ ] **Step 1: Run Next.js build to verify zero errors**

Run: `pnpm run build`
Expected: Build succeeds with 0 errors.
