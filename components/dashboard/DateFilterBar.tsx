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
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 shrink-0">
          <Calendar className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-neutral-200">
            ช่วงเวลา
          </span>
        </div>

        {/* Badges Container: Right-aligned using ml-auto */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 min-w-0">
          {PRESETS.map((preset, index) => {
            const isActive = datePreset === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => onPresetChange(preset.value)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all duration-200 whitespace-nowrap cursor-pointer shrink-0 shadow-2xs ${
                  index === 0 ? 'ml-auto' : ''
                } ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/20 scale-100'
                    : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 border border-slate-200/60 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Range Picker (Capsule Style — Right-aligned) */}
      {datePreset === 'custom' && (
        <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700/80 rounded-2xl p-2.5 shadow-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 w-full sm:w-[540px] sm:ml-auto animate-in fade-in-50 zoom-in-95 duration-150">
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
