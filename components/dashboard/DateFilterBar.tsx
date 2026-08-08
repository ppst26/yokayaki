"use client";

import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
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
    <div className="flex flex-col gap-3">
      {/* Preset Pill Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        <div className="flex items-center gap-1.5 text-card-sublabel mr-1 shrink-0">
          <Calendar className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span>ช่วงเวลา:</span>
        </div>
        {PRESETS.map(preset => {
          const isActive = datePreset === preset.value;
          return (
            <button
              key={preset.value}
              onClick={() => onPresetChange(preset.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap border-none shrink-0 ${
                isActive
                  ? 'bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25'
                  : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Picker (Capsule Style — Right-aligned) */}
      {datePreset === 'custom' && (
        <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700/80 rounded-2xl p-2.5 shadow-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 w-full sm:w-[540px] sm:ml-auto animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="flex items-center gap-2 flex-1 min-w-[150px]">
            <span className="text-card-sublabel shrink-0">
              เริ่ม
            </span>
            <DatePicker
              value={customStartDate}
              onChange={onCustomStartChange}
              placeholder="วันเริ่มต้น..."
              className="w-full"
            />
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 dark:text-neutral-500 shrink-0 hidden sm:block" />

          <div className="flex items-center gap-2 flex-1 min-w-[150px]">
            <span className="text-card-sublabel shrink-0">
              ถึง
            </span>
            <DatePicker
              value={customEndDate}
              onChange={onCustomEndChange}
              placeholder="วันสิ้นสุด..."
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};
