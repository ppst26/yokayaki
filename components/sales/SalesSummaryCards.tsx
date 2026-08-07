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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Revenue */}
      <Card className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            ยอดขายส่งมอบสุทธิ
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
        </div>
        <p className="text-2xl font-black text-slate-900 dark:text-neutral-100">
          {totalRevenue.toLocaleString()} <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">฿</span>
        </p>
      </Card>

      {/* Discounts */}
      <Card className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            ส่วนลดรวมทั้งหมด
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Tag className="w-4.5 h-4.5" />
          </div>
        </div>
        <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
          -{totalDiscount.toLocaleString()} <span className="text-xs font-bold text-rose-500 dark:text-rose-400">฿</span>
        </p>
      </Card>

      {/* Total Bills */}
      <Card className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            จำนวนบิลที่เช็คบิลแล้ว
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Receipt className="w-4.5 h-4.5" />
          </div>
        </div>
        <p className="text-2xl font-black text-slate-900 dark:text-neutral-100">
          {totalBills} <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">บิล</span>
        </p>
      </Card>

      {/* Voids */}
      <Card className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            รายการถูก Void ยกเลิก
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 flex items-center justify-center">
            <Trash2 className="w-4.5 h-4.5" />
          </div>
        </div>
        <p className="text-2xl font-black text-slate-700 dark:text-neutral-300">
          {totalVoidCount} <span className="text-xs font-bold text-slate-400 dark:text-neutral-500">รายการ ({totalVoidAmount.toLocaleString()} ฿)</span>
        </p>
      </Card>
    </div>
  );
};
