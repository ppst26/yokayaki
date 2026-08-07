"use client";

import { useState, useMemo } from 'react';

export type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | '3_months' | '6_months' | 'custom';

export interface DateFilterState {
  datePreset: DatePreset;
  customStartDate: string;
  customEndDate: string;
  startDate: Date;
  endDate: Date;
  setDatePreset: (preset: DatePreset) => void;
  setCustomStartDate: (date: string) => void;
  setCustomEndDate: (date: string) => void;
}

function getDateRange(preset: DatePreset, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      // start is already today 00:00
      break;
    case 'yesterday': {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'this_week': {
      const day = start.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diffToMonday);
      break;
    }
    case 'this_month':
      start.setDate(1);
      break;
    case '3_months':
      start.setMonth(start.getMonth() - 3);
      start.setDate(1);
      break;
    case '6_months':
      start.setMonth(start.getMonth() - 6);
      start.setDate(1);
      break;
    case 'custom': {
      if (customStart) {
        const cs = new Date(customStart);
        cs.setHours(0, 0, 0, 0);
        return {
          start: cs,
          end: customEnd ? (() => { const ce = new Date(customEnd); ce.setHours(23, 59, 59, 999); return ce; })() : end,
        };
      }
      break;
    }
  }

  return { start, end };
}

export function useDateFilter(): DateFilterState {
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const { start: startDate, end: endDate } = useMemo(
    () => getDateRange(datePreset, customStartDate, customEndDate),
    [datePreset, customStartDate, customEndDate]
  );

  return {
    datePreset,
    customStartDate,
    customEndDate,
    startDate,
    endDate,
    setDatePreset,
    setCustomStartDate,
    setCustomEndDate,
  };
}
