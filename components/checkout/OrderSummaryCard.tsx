"use client";

import React from 'react';
import { Tag, Coins } from 'lucide-react';

interface OrderedItem {
  id: number;
  quantity: number;
  unit_price: number;
  status: string;
  notes?: string;
  created_at: string;
  menu_items: { id: number; name: string };
}

interface Promotion {
  id: number;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_amount?: number;
  discount_percent?: number;
  coupon_code?: string;
}

interface FreeItemDetail {
  name: string;
  qty: number;
}

interface AppliedPromo {
  promo: Promotion;
  discountValue: number;
  freeItems?: FreeItemDetail[];
}

interface LoyaltyMember {
  phone_number: string;
  name: string;
  points: number;
}

interface OrderSummaryCardProps {
  activeItems: OrderedItem[];
  subtotal: number;
  appliedPromos: AppliedPromo[];
  loyaltyDiscount: number;
  netAmount: number;
  pointsEarned: number;
  member: LoyaltyMember | null;
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({
  activeItems,
  subtotal,
  appliedPromos,
  loyaltyDiscount,
  netAmount,
  pointsEarned,
  member,
}) => {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-extrabold text-slate-900 dark:text-neutral-100 mb-4 pb-2 border-b border-slate-100 dark:border-neutral-800">
        สรุปรายการอาหาร
      </h2>
      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
        {activeItems.map(item => (
          <div
            key={item.id}
            className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200/80 dark:border-neutral-700/60 text-xs space-y-1"
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 dark:text-neutral-100">
                  {item.menu_items?.name}
                </span>
                <span className="text-slate-500 dark:text-neutral-400 ml-2 font-semibold">
                  x{item.quantity}
                </span>
              </div>
              <span className="font-extrabold text-red-600 dark:text-red-400">
                {(item.quantity * item.unit_price).toLocaleString()} ฿
              </span>
            </div>
            {item.notes && (
              <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                โน้ต: {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-neutral-800 space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-500 dark:text-neutral-400">
            ยอดรวม ({activeItems.reduce((s, i) => s + i.quantity, 0)} ชิ้น)
          </span>
          <span className="text-slate-800 dark:text-neutral-200 font-bold">
            {subtotal.toLocaleString()} บาท
          </span>
        </div>
        {appliedPromos.map(ap => (
          <div key={ap.promo.id} className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {ap.promo.name}
              </span>
              <span className="text-red-600 dark:text-red-400 font-extrabold">
                -{ap.discountValue.toLocaleString()} บาท
              </span>
            </div>
            {ap.freeItems &&
              ap.freeItems.map((fi, idx) => (
                <div
                  key={idx}
                  className="text-[11px] text-slate-500 dark:text-neutral-400 pl-4 font-semibold"
                >
                  • ฟรี: {fi.name} x{fi.qty}
                </div>
              ))}
          </div>
        ))}
        {loyaltyDiscount > 0 && (
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400">
              ส่วนลดแต้มสมาชิก
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
              -{loyaltyDiscount.toLocaleString()} บาท
            </span>
          </div>
        )}
        <div className="flex justify-between items-center text-lg pt-3 border-t border-slate-100 dark:border-neutral-800">
          <span className="font-extrabold text-slate-900 dark:text-neutral-100">
            ยอดสุทธิรวม
          </span>
          <span className="font-black text-2xl text-red-600 dark:text-red-400">
            {netAmount.toLocaleString()} บาท
          </span>
        </div>

        {/* Points Earned Display */}
        <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-neutral-700 flex justify-between items-center bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 p-3 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Coins className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 block">
                แต้มที่จะได้รับจากบิลนี้
              </span>
              {member ? (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                  สะสมให้: {member.name} ({member.phone_number})
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium block">
                  *ระบุสมาชิก CRM เพื่อสะสมแต้ม
                </span>
              )}
            </div>
          </div>
          <span className="font-black text-base text-amber-600 dark:text-amber-400">
            +{pointsEarned.toLocaleString()} แต้ม
          </span>
        </div>
      </div>
    </div>
  );
};
