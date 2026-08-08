import React from 'react';
import { TicketPercent, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

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
    <Card className="p-5">
      <h3 className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-400 mb-3 flex items-center gap-2">
        <TicketPercent className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
        คูปองส่วนลด
      </h3>
      {couponApplied ? (
        <div className="pt-2 flex items-center justify-between">
          <div>
            <p className="text-red-600 dark:text-red-400 text-sm font-bold">
              {couponApplied.name}
            </p>
            <p className="text-slate-500 dark:text-neutral-400 text-xs md:text-sm">
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
              className="flex-1 bg-slate-50 dark:bg-neutral-800 rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-neutral-100 font-semibold focus:outline-none transition uppercase"
            />
            <button
              onClick={applyCoupon}
              disabled={!couponInput.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-xl text-sm font-bold text-white transition active:scale-95 cursor-pointer shadow-xs border-none"
            >
              ใช้คูปอง
            </button>
          </div>
          {couponError && (
            <p className="text-rose-600 dark:text-rose-400 text-xs md:text-sm mt-2 font-medium">
              {couponError}
            </p>
          )}
        </>
      )}
    </Card>
  );
};
