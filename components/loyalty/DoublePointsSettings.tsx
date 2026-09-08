"use client";

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DatePicker } from '@/components/ui/date-picker';
import {
  isDoublePointsActive,
  parseDoublePointsDates,
  sortDoublePointsDates,
  todayInTimezone,
  toggleDoublePointsDate,
} from '@/lib/doublePoints';

export function useDoublePointsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('Asia/Bangkok');
  const [newDate, setNewDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const activeToday = isDoublePointsActive(enabled, dates, timezone);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('org_settings')
        .select('double_points_enabled, double_points_dates, timezone')
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (data) {
        setEnabled(Boolean(data.double_points_enabled));
        setDates(sortDoublePointsDates(parseDoublePointsDates(data.double_points_dates)));
        setTimezone(data.timezone ?? 'Asia/Bangkok');
      }
    } catch (err: unknown) {
      console.error('fetch double points settings:', err);
      setError('โหลดการตั้งค่าไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleAddDate = () => {
    if (!newDate) return;
    setDates(prev => sortDoublePointsDates(toggleDoublePointsDate(prev, newDate)));
    setNewDate('');
    setSaved(false);
  };

  const handleRemoveDate = (date: string) => {
    setDates(prev => prev.filter(d => d !== date));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const { error: rpcError } = await supabase.rpc('update_double_points_settings', {
        p_enabled: enabled,
        p_dates: dates,
      });
      if (rpcError) throw rpcError;
      setSaved(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddToday = () => {
    const today = todayInTimezone(timezone);
    setDates(prev => sortDoublePointsDates(toggleDoublePointsDate(prev, today)));
    setSaved(false);
  };

  const statusLabel = activeToday
    ? 'วันนี้ x2'
    : enabled && dates.length > 0
      ? `เปิด · ${dates.length} วัน`
      : enabled
        ? 'เปิด'
        : null;

  return {
    loading,
    saving,
    enabled,
    setEnabled,
    dates,
    timezone,
    newDate,
    setNewDate,
    error,
    saved,
    activeToday,
    statusLabel,
    handleAddDate,
    handleRemoveDate,
    handleSave,
    handleAddToday,
    markDirty: () => setSaved(false),
  };
}

type DoublePointsSettingsFormProps = ReturnType<typeof useDoublePointsSettings>;

export function DoublePointsSettingsForm(props: DoublePointsSettingsFormProps) {
  const {
    loading,
    saving,
    enabled,
    setEnabled,
    dates,
    timezone,
    newDate,
    setNewDate,
    error,
    saved,
    activeToday,
    handleAddDate,
    handleRemoveDate,
    handleSave,
    handleAddToday,
    markDirty,
  } = props;

  if (loading) {
    return (
      <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
        กำลังโหลดการตั้งค่าวันแต้ม x2...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-caption">
          สมาชิกจะได้แต้มสะสม 2 เท่าในวันที่เลือก — คำนวณที่ปิดบิล (timezone: {timezone})
        </p>
        {activeToday && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-3 py-1 text-[11px] font-extrabold text-red-700 dark:bg-red-950/50 dark:text-red-300">
            วันนี้เปิดใช้งาน
          </span>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => {
            setEnabled(e.target.checked);
            markDirty();
          }}
          className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
        />
        <span className="text-xs font-bold text-slate-700 dark:text-neutral-200">
          เปิดใช้กิจกรรมแต้ม x2
        </span>
      </label>

      <div className="space-y-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
          วันที่เปิดใช้ ({dates.length})
        </p>
        <div className="flex min-h-8 flex-wrap gap-2">
          {dates.length === 0 && (
            <span className="text-xs font-medium text-slate-400 dark:text-neutral-500">
              ยังไม่มีวันที่ — เพิ่มด้านล่าง
            </span>
          )}
          {dates.map(date => (
            <span
              key={date}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300"
            >
              {date}
              <button
                type="button"
                onClick={() => handleRemoveDate(date)}
                className="cursor-pointer p-0.5 hover:text-rose-600"
                aria-label={`ลบ ${date}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <DatePicker
            value={newDate}
            onChange={val => {
              setNewDate(val);
              markDirty();
            }}
            placeholder="เลือกวันที่..."
            className="w-full sm:w-48"
            clearable={false}
            showIcon={false}
          />
          <button
            type="button"
            onClick={handleAddDate}
            disabled={!newDate}
            className="cursor-pointer rounded-xl bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-700 disabled:opacity-40 dark:bg-neutral-800 dark:text-neutral-200"
          >
            เพิ่มวัน
          </button>
          <button
            type="button"
            onClick={handleAddToday}
            className="cursor-pointer rounded-xl px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            + วันนี้
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>
      )}
      {saved && !error && (
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          บันทึกการตั้งค่าเรียบร้อยแล้ว
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="btn-crimson cursor-pointer rounded-xl px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
      >
        {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
      </button>
    </div>
  );
}

export function DoublePointsDialog() {
  const [open, setOpen] = useState(false);
  const settings = useDoublePointsSettings();

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        <span>วันแต้ม x2</span>
        {settings.statusLabel && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              settings.activeToday
                ? 'nav-active'
                : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
            }`}
          >
            {settings.statusLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center app-dialog-backdrop p-4"
          onClick={close}
        >
          <div
            className="app-dialog max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-neutral-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-neutral-100">
                  วันแต้ม x2 (Double Points)
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-neutral-500">
                  ตั้งค่าวันที่สมาชิกได้แต้ม 2 เท่า
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="cursor-pointer rounded-full p-1.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-neutral-300"
                aria-label="ปิด"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <DoublePointsSettingsForm {...settings} />
          </div>
        </div>
      )}
    </>
  );
}
