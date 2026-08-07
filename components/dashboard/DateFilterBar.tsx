"use client";

import React from 'react';
import { Calendar } from 'lucide-react';
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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 shrink-0">
        <Calendar className="w-4 h-4" />
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
  );
};
