# Mobile Date Filter Clean UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `DateFilterBar.tsx` for mobile view (< 640px) to use a single clean `<CustomSelect>` dropdown with inline custom date inputs, replacing multi-row pill button wrapping.

**Architecture:** Use Tailwind responsive utilities (`block sm:hidden` for mobile, `hidden sm:flex` for desktop) inside `DateFilterBar.tsx` to render `<CustomSelect>` on mobile screens and keep pill buttons on desktop.

**Tech Stack:** React 19, TypeScript 5, TailwindCSS 4, Lucide React icons, Next.js App Router.

## Global Constraints

- **Mobile View Boundary:** `< 640px` (`sm:hidden` / `block sm:hidden`)
- **Desktop View Boundary:** `≥ 640px` (`hidden sm:flex`)
- **Target File:** `components/dashboard/DateFilterBar.tsx`
- **Dropdown Component:** `@/components/ui/select` (`CustomSelect`)

---

### Task 1: Update DateFilterBar.tsx for Mobile Dropdown & Desktop View Split

**Files:**
- Modify: `components/dashboard/DateFilterBar.tsx`

**Interfaces:**
- Consumes: `DateFilterBarProps` (`datePreset`, `onPresetChange`, `customStartDate`, `customEndDate`, `onCustomStartChange`, `onCustomEndChange`), `CustomSelect` from `@/components/ui/select`
- Produces: Responsive DateFilterBar component with clean mobile UI and desktop pill layout

- [ ] **Step 1: Check existing DateFilterBar.tsx implementation**

Ensure imports and types align with `CustomSelect` and `DatePreset`.

- [ ] **Step 2: Update DateFilterBar.tsx with responsive mobile/desktop layout**

Update `components/dashboard/DateFilterBar.tsx` to the following complete implementation:

```tsx
"use client";

import React from 'react';
import { Calendar } from 'lucide-react';
import type { DatePreset } from '@/lib/useDateFilter';
import { CustomSelect } from '@/components/ui/select';

interface DateFilterBarProps {
  datePreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartChange: (date: string) => void;
  onCustomEndChange: (date: string) => void;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'วันนี้' },
  { value: 'yesterday', label: 'เมื่อวาน' },
  { value: 'this_week', label: 'สัปดาห์นี้' },
  { value: 'this_month', label: 'เดือนนี้' },
  { value: '3_months', label: '3 เดือน' },
  { value: '6_months', label: '6 เดือน' },
  { value: 'custom', label: 'กำหนดเอง' },
];

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  datePreset,
  onPresetChange,
  customStartDate,
  customEndDate,
  onCustomStartChange,
  onCustomEndChange,
}) => {
  const selectOptions = PRESETS.map(p => ({
    label: p.label,
    value: p.value,
  }));

  return (
    <div className="w-full">
      {/* ─── Mobile View (< 640px) ─── */}
      <div className="block sm:hidden space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 shrink-0">
            <Calendar className="w-4 h-4 text-red-500" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider">ช่วงเวลา</span>
          </div>

          <div className="flex-1 min-w-[160px]">
            <CustomSelect
              value={datePreset}
              onChange={(val) => onPresetChange(val as DatePreset)}
              options={selectOptions}
              searchable={false}
            />
          </div>
        </div>

        {/* Custom Date Pickers on Mobile */}
        {datePreset === 'custom' && (
          <div className="bg-slate-50 dark:bg-neutral-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-neutral-700/80 flex items-center justify-between gap-2">
            <div className="flex-1 flex items-center gap-1.5 bg-white dark:bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-neutral-500 shrink-0">เริ่ม</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => onCustomStartChange(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-neutral-100 outline-none"
              />
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-neutral-500 shrink-0">ถึง</span>
            <div className="flex-1 flex items-center gap-1.5 bg-white dark:bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-neutral-500 shrink-0">ถึง</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => onCustomEndChange(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-neutral-100 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Desktop View (≥ 640px) ─── */}
      <div className="hidden sm:flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 shrink-0">
          <Calendar className="w-4 h-4 text-red-500" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider">ช่วงเวลา</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => onPresetChange(preset.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition active:scale-95 cursor-pointer ${
                datePreset === preset.value
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm shadow-red-600/20'
                  : 'bg-white dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={e => onCustomStartChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-red-500/30"
            />
            <span className="text-xs font-bold text-slate-400 dark:text-neutral-500">ถึง</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => onCustomEndChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify build / dev server output**

Confirm that Next.js dev server compiles `DateFilterBar.tsx` without errors.

- [ ] **Step 4: Commit changes**

```bash
git add components/dashboard/DateFilterBar.tsx
git commit -m "feat(dashboard): redesign DateFilterBar for mobile clean UI with CustomSelect"
```
