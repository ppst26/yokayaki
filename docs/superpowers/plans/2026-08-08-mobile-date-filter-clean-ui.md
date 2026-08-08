# Mobile Date Filter UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the mobile date filter UI in `DateFilterBar.tsx` into a modern Segmented Control tab bar with a floating capsule-style custom date picker.

**Architecture:** Refactor `DateFilterBar.tsx` to introduce a responsive Segmented Control container (`bg-slate-100 dark:bg-neutral-800/80 p-1 rounded-2xl`) and an animated capsule date range card when `datePreset === 'custom'`.

**Tech Stack:** React 19, TailwindCSS 4, Lucide React icons.

## Global Constraints
- Next.js 16.2.10 App Router
- React 19.2.4 Client Component (`"use client"`)
- TailwindCSS ^4

---

### Task 1: Update DateFilterBar UI Component

**Files:**
- Modify: `components/dashboard/DateFilterBar.tsx`

**Interfaces:**
- Consumes: `DateFilterBarProps` (`datePreset`, `onPresetChange`, `customStartDate`, `customEndDate`, `onCustomStartChange`, `onCustomEndChange`)
- Produces: Updated JSX layout supporting mobile Segmented Control & capsule date range picker.

- [ ] **Step 1: Inspect existing DateFilterBar component**

Verify `components/dashboard/DateFilterBar.tsx` props and handlers.

- [ ] **Step 2: Update DateFilterBar.tsx JSX with Segmented Control layout**

```tsx
"use client";

import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import type { DatePreset } from '@/lib/useDateFilter';

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
  return (
    <div className="space-y-2.5 w-full">
      {/* Header & Segmented Control Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 shrink-0">
          <Calendar className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-neutral-200">
            ช่วงเวลา
          </span>
        </div>

        {/* Segmented Control Bar (Horizontal Scrollable on Mobile) */}
        <div className="bg-slate-100 dark:bg-neutral-800/80 p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
          {PRESETS.map(preset => {
            const isActive = datePreset === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => onPresetChange(preset.value)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all duration-200 whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 shadow-xs scale-100'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 hover:bg-slate-200/50 dark:hover:bg-neutral-700/40'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Range Picker (Capsule Style) */}
      {datePreset === 'custom' && (
        <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700/80 rounded-2xl p-2.5 shadow-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="flex items-center gap-2 flex-1 min-w-[130px]">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase tracking-wider shrink-0">
              เริ่ม
            </span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => onCustomStartChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:outline-none focus:border-red-500 cursor-pointer"
            />
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 shrink-0 hidden sm:block" />

          <div className="flex items-center gap-2 flex-1 min-w-[130px]">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase tracking-wider shrink-0">
              ถึง
            </span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => onCustomEndChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-neutral-100 focus:outline-none focus:border-red-500 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
