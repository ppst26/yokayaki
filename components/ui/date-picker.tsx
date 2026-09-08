"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  align?: 'left' | 'right' | 'auto';
  clearable?: boolean;
  showIcon?: boolean;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตลุาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'เลือกวันที่...',
  className = '',
  disabled = false,
  minDate,
  maxDate,
  clearable = true,
  showIcon = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    bottom?: number;
    left: number;
    width: number;
    placeAbove: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const initialViewDate = selectedDate || new Date();

  const [viewYear, setViewYear] = useState(initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    const anchor = triggerRef.current ?? containerRef.current;
    if (!anchor) return null;

    const rect = anchor.getBoundingClientRect();
    const popoverHeight = 360;
    const popoverWidth = 288;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    left = Math.max(8, left);

    const newCoords = {
      top: placeAbove ? 0 : rect.bottom + 4,
      bottom: placeAbove ? window.innerHeight - rect.top + 4 : undefined,
      left,
      width: Math.max(rect.width, popoverWidth),
      placeAbove,
    };
    setCoords(newCoords);
    return newCoords;
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen, updateCoords]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

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

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const isDateDisabled = (dateStr: string) => {
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;
    if (isDateDisabled(dateStr)) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const formattedMonth = String(today.getMonth() + 1).padStart(2, '0');
    const formattedDay = String(today.getDate()).padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${formattedMonth}-${formattedDay}`;
    if (isDateDisabled(dateStr)) return;
    onChange(dateStr);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = THAI_MONTHS[d.getMonth()];
    const yearBE = d.getFullYear() + 543;
    return `${day} ${month} ${yearBE}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const popover =
    isOpen && mounted && coords
      ? createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              ...(coords.placeAbove
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              zIndex: 99999,
            }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-neutral-800">
              <span className="text-sm font-black text-slate-900 dark:text-neutral-100">
                {THAI_MONTHS[viewMonth]} {viewYear + 543}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1 text-center">
              {THAI_DAYS.map(day => (
                <span
                  key={day}
                  className="py-1 text-xs font-bold text-slate-400 dark:text-neutral-500"
                >
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {days.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-8" />;
                }

                const formattedMonth = String(viewMonth + 1).padStart(2, '0');
                const formattedDay = String(day).padStart(2, '0');
                const dateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;

                const isSelected = value === dateStr;
                const isToday = todayStr === dateStr;
                const isDisabled = isDateDisabled(dateStr);

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectDay(day)}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-xl text-xs font-extrabold transition active:scale-95 ${
                      isDisabled
                        ? 'cursor-not-allowed text-slate-300 dark:text-neutral-700'
                        : isSelected
                          ? 'cursor-pointer bg-red-600 text-white shadow-md shadow-red-600/30'
                          : isToday
                            ? 'cursor-pointer border border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400'
                            : 'cursor-pointer text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-neutral-800">
              <button
                type="button"
                onClick={handleSelectToday}
                className="cursor-pointer font-extrabold text-red-600 dark:text-red-400 hover:text-red-700"
              >
                วันนี้
              </button>
              {value && clearable && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="cursor-pointer font-bold text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300"
                >
                  ล้างข้อมูล
                </button>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        className={`flex w-full items-center gap-1 rounded-xl border border-slate-200 bg-white shadow-2xs transition hover:border-slate-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 ${
          disabled ? 'opacity-50' : ''
        }`}
      >
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-slate-800 disabled:cursor-not-allowed dark:text-neutral-100 sm:text-sm"
        >
          <div className="flex min-w-0 items-center gap-2 truncate">
            {showIcon ? (
              <CalendarIcon className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            ) : null}
            <span
              className={
                value
                  ? 'truncate font-bold text-slate-900 dark:text-neutral-100'
                  : 'truncate font-normal text-slate-400 dark:text-neutral-500'
              }
            >
              {value ? formatDisplayDate(value) : placeholder}
            </span>
          </div>
        </button>
        {value && clearable ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="mr-2 shrink-0 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            title="ล้างวันที่"
            aria-label="ล้างวันที่"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {popover}
    </div>
  );
};
