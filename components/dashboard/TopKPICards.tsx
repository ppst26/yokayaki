"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface TopKPICardsProps {
  startDate: Date;
  endDate: Date;
  refreshKey: number;
}

interface FinancialData {
  grossSales: number;
  totalDiscounts: number;
  netRevenue: number;
  totalIngredientCost: number;
  estimatedProfit: number;
}

export const TopKPICards: React.FC<TopKPICardsProps> = ({ startDate, endDate, refreshKey }) => {
  const [data, setData] = useState<FinancialData>({
    grossSales: 0,
    totalDiscounts: 0,
    netRevenue: 0,
    totalIngredientCost: 0,
    estimatedProfit: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        // 1. Fetch Revenue & Discounts from payments
        const { data: payments } = await supabase
          .from('payments')
          .select('subtotal, discount_amount, net_amount')
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        let grossSales = 0;
        let totalDiscounts = 0;
        let netRevenue = 0;

        (payments || []).forEach((p: any) => {
          const net = parseFloat(p.net_amount as any) || 0;
          const sub = parseFloat(p.subtotal as any) || net;
          const disc = parseFloat(p.discount_amount as any) || 0;

          netRevenue += net;
          grossSales += sub;
          totalDiscounts += disc;
        });

        // 2. Fetch Ingredient Costs from item_ingredients
        const startDateStr = startDate.toISOString().slice(0, 10);
        const endDateStr = endDate.toISOString().slice(0, 10);

        const { data: ingredients } = await supabase
          .from('item_ingredients')
          .select('cost')
          .gte('purchase_date', startDateStr)
          .lte('purchase_date', endDateStr);

        const totalIngredientCost = (ingredients || []).reduce(
          (sum, ing) => sum + (parseFloat(ing.cost as any) || 0),
          0
        );

        const estimatedProfit = netRevenue - totalIngredientCost;

        setData({
          grossSales,
          totalDiscounts,
          netRevenue,
          totalIngredientCost,
          estimatedProfit,
        });
      } catch (err) {
        console.error('TopKPICards fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [startDate, endDate, refreshKey]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {/* Card 1: ยอดขายสุทธิ (Net Sales) */}
      <Card className="p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-card-label">
            ยอดขายสุทธิ
          </span>
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
              {data.netRevenue.toLocaleString()}{' '}
              <span className="text-card-unit">฿</span>
            </p>
            <p className="text-card-sublabel mt-1">
              (ก่อนหักโปร ฿{data.grossSales.toLocaleString()} • ส่วนลด <span className="text-rose-600 dark:text-rose-400 font-bold">฿{data.totalDiscounts.toLocaleString()}</span>)
            </p>
          </div>
        )}
      </Card>

      {/* Card 2: กำไรประมาณการ (Estimated Profit) */}
      <Card className="p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-card-label">
            กำไรประมาณการ
          </span>
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-50 dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700 flex items-center justify-center shrink-0 ${
            data.estimatedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
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
            <p className={`text-xl sm:text-2xl font-black ${
              data.estimatedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {data.estimatedProfit.toLocaleString()}{' '}
              <span className="text-card-unit">฿</span>
            </p>
            <p className="text-card-sublabel mt-1">
              (ยอดขายสุทธิ ฿{data.netRevenue.toLocaleString()} • จัดซื้อ <span className="text-rose-600 dark:text-rose-400 font-bold">฿{data.totalIngredientCost.toLocaleString()}</span>)
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
