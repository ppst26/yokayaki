"use client";

import React from 'react';
import { TicketPercent, X } from 'lucide-react';

interface Promotion {
  id: number;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_amount?: number;
  discount_percent?: number;
  coupon_code?: string;
}

interface CouponInputCardProps {
  couponApplied: Promotion | null;
  couponInput: string;
  setCouponInput: (val: string) => void;
  couponError: string | null;
  setCouponError: (val: string | null) => void;
  applyCoupon: () => void;
  removeCoupon: () => void;
}

export const CouponInputCard: React.FC<CouponInputCardProps> = ({
  couponApplied,
  couponInput,
  setCouponInput,
  couponError,
  setCouponError,
  applyCoupon,
  removeCoupon,
}) => {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-400 mb-3 flex items-center gap-2">
        <TicketPercent className="w-4 h-4 text-red-600 dark:text-red-400" />
        คูปองส่วนลด
      </h3>
      {couponApplied ? (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-red-700 dark:text-red-300 text-xs font-bold">
              {couponApplied.name}
            </p>
            <p className="text-red-600/80 dark:text-red-400/80 text-[11px]">
              โค้ด: {couponApplied.coupon_code} • ลด {couponApplied.discount_amount} บาท
            </p>
          </div>
          <button
            onClick={removeCoupon}
            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder='รหัสคูปอง เช่น "YOKA50"'
              value={couponInput}
              onChange={e => {
                setCouponInput(e.target.value.toUpperCase());
                setCouponError(null);
              }}
              className="flex-1 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-neutral-100 font-semibold focus:border-red-500 focus:outline-none transition uppercase"
            />
            <button
              onClick={applyCoupon}
              disabled={!couponInput.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-xs"
            >
              ใช้คูปอง
            </button>
          </div>
          {couponError && (
            <p className="text-rose-600 dark:text-rose-400 text-xs mt-2 font-medium">
              {couponError}
            </p>
          )}
        </>
      )}
    </div>
  );
};
