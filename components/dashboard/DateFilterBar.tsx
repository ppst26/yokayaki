"use client";

import React, { useEffect, useRef, useState } from 'react';
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
  const barRef = useRef<HTMLDivElement>(null);
  const customBtnRef = useRef<HTMLButtonElement>(null);
  const [customOffset, setCustomOffset] = useState(0);

  useEffect(() => {
    if (datePreset !== 'custom' || !barRef.current || !customBtnRef.current) return;

    const updateOffset = () => {
      const bar = barRef.current;
      const btn = customBtnRef.current;
      if (!bar || !btn) return;
      setCustomOffset(btn.offsetLeft + btn.offsetWidth + 8);
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, [datePreset]);

  return (
    <div ref={barRef} className="relative h-10">
      <div className="flex h-10 items-center gap-1.5 overflow-x-auto px-0.5 no-scrollbar">
        <div className="mr-1 flex shrink-0 items-center gap-1.5 text-card-sublabel">
          <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span>ช่วงเวลา:</span>
        </div>
        {PRESETS.map(preset => {
          const isActive = datePreset === preset.value;
          return (
            <button
              key={preset.value}
              ref={preset.value === 'custom' ? customBtnRef : undefined}
              type="button"
              onClick={() => onPresetChange(preset.value)}
              className={`badge-pill shrink-0 ${isActive ? 'badge-active' : 'badge-inactive'}`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {datePreset === 'custom' && (
        <div
          className="absolute top-0 z-20 flex h-10 items-center gap-2"
          style={{ left: customOffset }}
        >
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-card-sublabel shrink-0">เริ่ม</span>
            <DatePicker
              value={customStartDate}
              onChange={onCustomStartChange}
              placeholder="วันเริ่มต้น..."
              className="w-40 sm:w-44"
              align="auto"
            />
          </div>

          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-neutral-500" />

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-card-sublabel shrink-0">ถึง</span>
            <DatePicker
              value={customEndDate}
              onChange={onCustomEndChange}
              placeholder="วันสิ้นสุด..."
              className="w-40 sm:w-44"
              align="auto"
              minDate={customStartDate || undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};
