"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { DatePreset } from '@/lib/useDateFilter';

interface DateFilterBarProps {
  datePreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartChange: (date: string) => void;
  onCustomEndChange: (date: string) => void;
}

const PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'วันนี้' },
  { value: 'yesterday', label: 'เมื่อวาน' },
  { value: 'this_week', label: 'สัปดาห์นี้' },
  { value: 'this_month', label: 'เดือนนี้' },
  { value: '3_months', label: '3 เดือน' },
  { value: '6_months', label: '6 เดือน' },
];

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'วันนี้',
  yesterday: 'เมื่อวาน',
  this_week: 'สัปดาห์นี้',
  this_month: 'เดือนนี้',
  '3_months': '3 เดือน',
  '6_months': '6 เดือน',
  custom: 'กำหนดเอง',
};

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
  'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
  'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

interface CalendarCell {
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  datePreset,
  onPresetChange,
  customStartDate,
  customEndDate,
  onCustomStartChange,
  onCustomEndChange,
}) => {
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Popover coords
  const [selectCoords, setSelectCoords] = useState<{ top: number; bottom?: number; left: number; width: number; placeAbove: boolean } | null>(null);
  const [rangeCoords, setRangeCoords] = useState<{ top: number; bottom?: number; left: number; width: number; placeAbove: boolean } | null>(null);

  const selectTriggerRef = useRef<HTMLButtonElement>(null);
  const selectPopoverRef = useRef<HTMLDivElement>(null);

  const rangePickerTriggerRef = useRef<HTMLButtonElement>(null);
  const rangePickerPopoverRef = useRef<HTMLDivElement>(null);

  // Range Picker Internal State
  const [tempStart, setTempStart] = useState(customStartDate);
  const [tempEnd, setTempEnd] = useState(customEndDate);
  const [activeField, setActiveField] = useState<'start' | 'end'>('start');

  const initialDate = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update Popover Coordinates
  const updateSelectCoords = useCallback(() => {
    if (!selectTriggerRef.current) return null;
    const rect = selectTriggerRef.current.getBoundingClientRect();
    const dropdownHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const coords = {
      top: placeAbove ? 0 : rect.bottom + 6,
      bottom: placeAbove ? window.innerHeight - rect.top + 6 : undefined,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 200)),
      width: Math.max(rect.width, 180),
      placeAbove,
    };
    setSelectCoords(coords);
    return coords;
  }, []);

  const updateRangeCoords = useCallback(() => {
    if (!rangePickerTriggerRef.current) return null;
    const rect = rangePickerTriggerRef.current.getBoundingClientRect();
    const popoverHeight = 440;
    const popoverWidth = 330;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    left = Math.max(12, left);

    const coords = {
      top: placeAbove ? 0 : rect.bottom + 6,
      bottom: placeAbove ? window.innerHeight - rect.top + 6 : undefined,
      left,
      width: popoverWidth,
      placeAbove,
    };
    setRangeCoords(coords);
    return coords;
  }, []);

  // Sync coords on resize & scroll
  useEffect(() => {
    if (isSelectOpen) {
      updateSelectCoords();
      const onResize = () => updateSelectCoords();
      window.addEventListener('resize', onResize);
      window.addEventListener('scroll', onResize, true);
      return () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('scroll', onResize, true);
      };
    }
  }, [isSelectOpen, updateSelectCoords]);

  useEffect(() => {
    if (isRangePickerOpen) {
      updateRangeCoords();
      const onResize = () => updateRangeCoords();
      window.addEventListener('resize', onResize);
      window.addEventListener('scroll', onResize, true);
      return () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('scroll', onResize, true);
      };
    }
  }, [isRangePickerOpen, updateRangeCoords]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        isSelectOpen &&
        selectTriggerRef.current &&
        !selectTriggerRef.current.contains(target) &&
        selectPopoverRef.current &&
        !selectPopoverRef.current.contains(target)
      ) {
        setIsSelectOpen(false);
      }

      if (
        isRangePickerOpen &&
        rangePickerTriggerRef.current &&
        !rangePickerTriggerRef.current.contains(target) &&
        rangePickerPopoverRef.current &&
        !rangePickerPopoverRef.current.contains(target)
      ) {
        setIsRangePickerOpen(false);
      }
    };

    if (isSelectOpen || isRangePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSelectOpen, isRangePickerOpen]);

  // Toggles
  const handleToggleSelect = () => {
    if (!isSelectOpen) {
      updateSelectCoords();
      setIsSelectOpen(true);
      setIsRangePickerOpen(false);
    } else {
      setIsSelectOpen(false);
    }
  };

  const handleToggleRangePicker = () => {
    if (!isRangePickerOpen) {
      // Sync temp dates with current values or defaults
      const now = new Date();
      const startDef = customStartDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const endDef = customEndDate || now.toISOString().slice(0, 10);

      setTempStart(startDef);
      setTempEnd(endDef);
      setActiveField('start');

      const d = new Date((startDef || endDef) + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }

      updateRangeCoords();
      setIsRangePickerOpen(true);
      setIsSelectOpen(false);
    } else {
      setIsRangePickerOpen(false);
    }
  };

  // Month navigation
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Calendar days calculation (including previous and next month overflow days)
  const calendarDays = useMemo<CalendarCell[]>(() => {
    const result: CalendarCell[] = [];

    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 6 = Sat
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    // Previous month overflow days
    const prevMonthYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = daysInPrevMonth - firstDayOfWeek + 1 + i;
      const dateStr = `${prevMonthYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      result.push({ day, dateStr, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push({ day: d, dateStr, isCurrentMonth: true });
    }

    // Next month overflow days (fill complete rows, up to multiple of 7)
    const totalCells = result.length <= 35 ? 35 : 42;
    const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    let nextDay = 1;
    while (result.length < totalCells) {
      const dateStr = `${nextMonthYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
      result.push({ day: nextDay, dateStr, isCurrentMonth: false });
      nextDay++;
    }

    return result;
  }, [viewYear, viewMonth]);

  // Day click logic
  const handleDayClick = (dateStr: string) => {
    if (activeField === 'start') {
      setTempStart(dateStr);
      if (tempEnd && dateStr > tempEnd) {
        setTempEnd(dateStr);
      }
      setActiveField('end');
    } else {
      if (tempStart && dateStr < tempStart) {
        setTempStart(dateStr);
        setActiveField('end');
      } else {
        setTempEnd(dateStr);
        setActiveField('start');
      }
    }
  };

  // Actions
  const handleClear = () => {
    setTempStart('');
    setTempEnd('');
    setActiveField('start');
  };

  const handleApply = () => {
    onCustomStartChange(tempStart);
    onCustomEndChange(tempEnd);
    onPresetChange('custom');
    setIsRangePickerOpen(false);
  };

  // Select Popover Element
  const selectPopover =
    isSelectOpen && mounted && selectCoords
      ? createPortal(
          <div
            ref={selectPopoverRef}
            style={{
              position: 'fixed',
              left: `${selectCoords.left}px`,
              width: `${selectCoords.width}px`,
              ...(selectCoords.placeAbove
                ? { bottom: `${selectCoords.bottom}px` }
                : { top: `${selectCoords.top}px` }),
              zIndex: 99999,
            }}
            className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="space-y-0.5">
              {PRESET_OPTIONS.map(opt => {
                const isSelected = datePreset === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onPresetChange(opt.value);
                      setIsSelectOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold'
                        : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )
      : null;

  // Range Picker Popover Element
  const rangePickerPopover =
    isRangePickerOpen && mounted && rangeCoords
      ? createPortal(
          <div
            ref={rangePickerPopoverRef}
            style={{
              position: 'fixed',
              left: `${rangeCoords.left}px`,
              width: `${rangeCoords.width}px`,
              ...(rangeCoords.placeAbove
                ? { bottom: `${rangeCoords.bottom}px` }
                : { top: `${rangeCoords.top}px` }),
              zIndex: 99999,
            }}
            className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-zinc-100"
          >
            {/* Top Date Selection Inputs */}
            <div className="flex items-center gap-2">
              {/* จากวันที่ */}
              <button
                type="button"
                onClick={() => setActiveField('start')}
                className={`flex-1 flex flex-col p-2.5 rounded-xl border transition text-left cursor-pointer ${
                  activeField === 'start'
                    ? 'border-red-500/80 bg-red-50/70 dark:border-red-500/70 dark:bg-red-950/30'
                    : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80'
                }`}
              >
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mb-0.5">
                  จากวันที่
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-zinc-200 font-semibold truncate">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
                  <span className="truncate">{formatShortDate(tempStart) || 'เลือกวันที่'}</span>
                </div>
              </button>

              <span className="text-slate-400 dark:text-zinc-500 font-bold text-sm shrink-0">—</span>

              {/* ถึงวันที่ */}
              <button
                type="button"
                onClick={() => setActiveField('end')}
                className={`flex-1 flex flex-col p-2.5 rounded-xl border transition text-left cursor-pointer ${
                  activeField === 'end'
                    ? 'border-red-500/80 bg-red-50/70 dark:border-red-500/70 dark:bg-red-950/30'
                    : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80'
                }`}
              >
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mb-0.5">
                  ถึงวันที่
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-zinc-200 font-semibold truncate">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
                  <span className="truncate">{formatShortDate(tempEnd) || 'เลือกวันที่'}</span>
                </div>
              </button>
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between px-1 pt-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition cursor-pointer"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                {THAI_MONTHS_FULL[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition cursor-pointer"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
              {THAI_DAYS.map(day => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {calendarDays.map((cell, idx) => {
                const isStart = cell.dateStr === tempStart;
                const isEnd = cell.dateStr === tempEnd;
                const isInRange =
                  tempStart && tempEnd && cell.dateStr > tempStart && cell.dateStr < tempEnd;
                const isCurrentMonth = cell.isCurrentMonth;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDayClick(cell.dateStr)}
                    className={`h-8 w-8 mx-auto flex items-center justify-center text-xs transition cursor-pointer ${
                      isStart || isEnd
                        ? 'bg-red-600 text-white rounded-full font-bold shadow-sm'
                        : isInRange
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200 rounded-md font-medium'
                          : isCurrentMonth
                            ? 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full font-medium'
                            : 'text-slate-300 dark:text-zinc-600 hover:text-slate-400 dark:hover:text-zinc-400 rounded-full font-normal'
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-500 hover:text-red-400 font-semibold cursor-pointer transition px-1 py-1"
              >
                ล้างค่า
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRangePickerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 border border-transparent dark:border-zinc-700/60 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-bold transition cursor-pointer shadow-sm shadow-red-950/40"
                >
                  นำไปใช้
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
      {/* 1. Label */}
      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400 shrink-0">
        <Calendar className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
        <span>ช่วงเวลา:</span>
      </div>

      {/* 2. Select ช่วงเวลา */}
      <button
        ref={selectTriggerRef}
        type="button"
        onClick={handleToggleSelect}
        className="h-10 px-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center justify-between gap-2.5 transition cursor-pointer shrink-0 min-w-[170px]"
      >
        <span>เลือกช่วง: {PRESET_LABELS[datePreset] || 'เดือนนี้'}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 transition-transform duration-200 ${
            isSelectOpen ? 'rotate-180 text-red-500' : ''
          }`}
        />
      </button>

      {/* 3. ปุ่ม กำหนดเอง */}
      <button
        ref={rangePickerTriggerRef}
        type="button"
        onClick={handleToggleRangePicker}
        className={`h-10 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer shrink-0 ${
          isRangePickerOpen || datePreset === 'custom'
            ? 'border-red-900/60 bg-red-950/20 text-red-400 font-bold'
            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:text-zinc-300'
        }`}
      >
        <Calendar className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
        <span>กำหนดเอง</span>
      </button>

      {/* Portaled Popovers */}
      {selectPopover}
      {rangePickerPopover}
    </div>
  );
};
