"use client";

import React from 'react';
import { X, Plus, Minus } from 'lucide-react';

interface PointsHistoryModalProps {
  showPointsModal: boolean;
  setShowPointsModal: (val: boolean) => void;
  pointsDirection: 'add' | 'deduct';
  setPointsDirection: (val: 'add' | 'deduct') => void;
  pointsAdjustment: string;
  setPointsAdjustment: (val: string) => void;
  pointsReason: string;
  setPointsReason: (val: string) => void;
  presetReasons: string[];
  handleAdjustPoints: () => void;
  isAdjusting: boolean;
  memberName?: string;
  currentPoints?: number;
}

export const PointsHistoryModal: React.FC<PointsHistoryModalProps> = ({
  showPointsModal,
  setShowPointsModal,
  pointsDirection,
  setPointsDirection,
  pointsAdjustment,
  setPointsAdjustment,
  pointsReason,
  setPointsReason,
  presetReasons,
  handleAdjustPoints,
  isAdjusting,
  memberName,
  currentPoints = 0,
}) => {
  if (!showPointsModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
            ปรับแต้มสะสม ({memberName})
          </h3>
          <button
            onClick={() => setShowPointsModal(false)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold">
          แต้มปัจจุบัน: <span className="font-extrabold text-amber-600 dark:text-amber-400">{currentPoints} แต้ม</span>
        </p>

        {/* Direction toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPointsDirection('add')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer border ${
              pointsDirection === 'add'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300'
            }`}
          >
            <Plus className="w-4 h-4" />
            เพิ่มแต้ม
          </button>

          <button
            type="button"
            onClick={() => setPointsDirection('deduct')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer border ${
              pointsDirection === 'deduct'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300'
            }`}
          >
            <Minus className="w-4 h-4" />
            ลดแต้ม
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-neutral-400 mb-1">
            จำนวนแต้ม:
          </label>
          <input
            type="number"
            min={1}
            placeholder="เช่น 50"
            value={pointsAdjustment}
            onChange={e => setPointsAdjustment(e.target.value)}
            className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-neutral-400 mb-1">
            เหตุผลในการปรับแต้ม *:
          </label>
          <input
            type="text"
            placeholder="ระบุเหตุผล..."
            value={pointsReason}
            onChange={e => setPointsReason(e.target.value)}
            className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-800 dark:text-neutral-100 focus:border-red-500 focus:outline-none mb-2"
          />

          <div className="flex flex-wrap gap-1.5">
            {presetReasons.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setPointsReason(r)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-neutral-300 transition active:scale-95 cursor-pointer"
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setShowPointsModal(false)}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleAdjustPoints}
            disabled={isAdjusting || !pointsAdjustment || !pointsReason.trim()}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/20 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isAdjusting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'ยืนยันการปรับแต้ม'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
