"use client";

import React from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { DashboardBundle } from '@/lib/useDashboardBundle';

interface TopKPICardsProps {
  bundle: DashboardBundle;
}

export const TopKPICards: React.FC<TopKPICardsProps> = ({ bundle }) => {
  const { payments, ingredients, loading } = bundle;

  let grossSales = 0;
  let totalDiscounts = 0;
  let netRevenue = 0;

  payments.forEach(p => {
    const net = parseFloat(String(p.net_amount)) || 0;
    const sub = parseFloat(String(p.subtotal)) || net;
    const disc = parseFloat(String(p.discount_amount)) || 0;
    netRevenue += net;
    grossSales += sub;
    totalDiscounts += disc;
  });

  const totalIngredientCost = ingredients.reduce(
    (sum, ing) => sum + (parseFloat(String(ing.cost)) || 0),
    0,
  );
  const estimatedProfit = netRevenue - totalIngredientCost;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <Card className="p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-card-label">ยอดขายสุทธิ</span>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-50 dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-1.5">
            <div className="h-7 w-32 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-neutral-100">
              {netRevenue.toLocaleString()}{' '}
              <span className="text-card-unit">฿</span>
            </p>
            <p className="text-card-sublabel mt-1">
              (ก่อนหักโปร ฿{grossSales.toLocaleString()} • ส่วนลด{' '}
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                ฿{totalDiscounts.toLocaleString()}
              </span>
              )
            </p>
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-card-label">กำไรประมาณการ</span>
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-50 dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700 flex items-center justify-center shrink-0 ${
              estimatedProfit >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-1.5">
            <div className="h-7 w-32 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div>
            <p
              className={`text-xl sm:text-2xl font-black ${
                estimatedProfit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {estimatedProfit.toLocaleString()}{' '}
              <span className="text-card-unit">฿</span>
            </p>
            <p className="text-card-sublabel mt-1">
              (ยอดขายสุทธิ ฿{netRevenue.toLocaleString()} • จัดซื้อ{' '}
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                ฿{totalIngredientCost.toLocaleString()}
              </span>
              )
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
