"use client";

import React from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { VOID_REASONS, VOID_REASON_OTHER } from '@/lib/voidReasons';

interface OrderedItem {
  id: number;
  quantity: number;
  unit_price: number;
  status: 'pending' | 'served' | 'voided';
  notes?: string;
  menu_items: {
    name: string;
  };
}

interface VoidItemModalProps {
  voidTarget: OrderedItem | null;
  setVoidTarget: (item: OrderedItem | null) => void;
  voidQuantity: number;
  setVoidQuantity: (qty: number) => void;
  voidReason: string;
  setVoidReason: (reason: string) => void;
  customReason: string;
  setCustomReason: (reason: string) => void;
  executeVoid: () => void;
  isVoiding: boolean;
}

export const VoidItemModal: React.FC<VoidItemModalProps> = ({
  voidTarget,
  setVoidTarget,
  voidQuantity,
  setVoidQuantity,
  voidReason,
  setVoidReason,
  customReason,
  setCustomReason,
  executeVoid,
  isVoiding,
}) => {
  if (!voidTarget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            ยกเลิกรายการ (Void Item)
          </h3>
          <button
            onClick={() => setVoidTarget(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-xs space-y-1">
          <p className="font-extrabold text-slate-900 dark:text-neutral-100">
            {voidTarget.menu_items?.name}
          </p>
          <p className="text-slate-500 dark:text-neutral-400">
            จำนวนทั้งหมดในบิล: {voidTarget.quantity} ชิ้น (ชิ้นละ {voidTarget.unit_price} ฿)
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-neutral-400 mb-1">
            จำนวนที่ต้องการ Void:
          </label>
          <div className="flex items-center gap-2">
            {[...Array(voidTarget.quantity)].map((_, i) => (
              <button
                key={i + 1}
                type="button"
                onClick={() => setVoidQuantity(i + 1)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  voidQuantity === i + 1
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-neutral-400 mb-1">
            เหตุผลในการยกเลิก:
          </label>
          <div className="space-y-1.5">
            {VOID_REASONS.map(r => (
              <label
                key={r.code}
                className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-neutral-300 cursor-pointer"
              >
                <input
                  type="radio"
                  name="voidReason"
                  checked={voidReason === r.code}
                  onChange={() => setVoidReason(r.code)}
                  className="accent-rose-600"
                />
                <span>{r.label}</span>
                {r.restoresStock && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    (คืนสต็อก)
                  </span>
                )}
              </label>
            ))}
          </div>
          {voidReason === VOID_REASON_OTHER && (
            <input
              type="text"
              placeholder="ระบุเหตุผล..."
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              className="w-full mt-2 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-neutral-100 focus:outline-none"
            />
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setVoidTarget(null)}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            onClick={executeVoid}
            disabled={isVoiding}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isVoiding ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'ยืนยัน Void'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
