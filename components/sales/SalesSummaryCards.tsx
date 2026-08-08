"use client";

import React from 'react';
import { TrendingUp, Tag, Receipt, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SalesSummaryCardsProps {
  totalRevenue: number;
  totalDiscount: number;
  totalBills: number;
  totalVoidCount: number;
  totalVoidAmount: number;
}

export const SalesSummaryCards: React.FC<SalesSummaryCardsProps> = ({
  totalRevenue,
  totalDiscount,
  totalBills,
  totalVoidCount,
  totalVoidAmount,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {/* Revenue */}
      <Card className="p-3.5 md:p-5 space-y-1.5 md:space-y-2">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 truncate">
            ยอดขายส่งมอบสุทธิ
          </span>
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </div>
        </div>
        <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-neutral-100">
          {totalRevenue.toLocaleString()} <span className="text-xs md:text-sm font-bold text-slate-500 dark:text-neutral-400">฿</span>
        </p>
      </Card>

      {/* Discounts */}
      <Card className="p-3.5 md:p-5 space-y-1.5 md:space-y-2">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 truncate">
            ส่วนลดรวมทั้งหมด
          </span>
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Tag className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </div>
        </div>
        <p className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400">
          -{totalDiscount.toLocaleString()} <span className="text-xs md:text-sm font-bold text-rose-500 dark:text-rose-400">฿</span>
        </p>
      </Card>

      {/* Total Bills */}
      <Card className="p-3.5 md:p-5 space-y-1.5 md:space-y-2">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 truncate">
            จำนวนบิลที่เช็คบิลแล้ว
          </span>
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Receipt className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </div>
        </div>
        <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-neutral-100">
          {totalBills} <span className="text-xs md:text-sm font-bold text-slate-500 dark:text-neutral-400">บิล</span>
        </p>
      </Card>

      {/* Voids */}
      <Card className="p-3.5 md:p-5 space-y-1.5 md:space-y-2">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 truncate">
            รายการถูก Void ยกเลิก
          </span>
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
          </div>
        </div>
        <p className="text-xl md:text-2xl font-black text-slate-700 dark:text-neutral-300">
          {totalVoidCount} <span className="text-xs md:text-sm font-bold text-slate-400 dark:text-neutral-500">รายการ ({totalVoidAmount.toLocaleString()} ฿)</span>
        </p>
      </Card>
    </div>
  );
};
