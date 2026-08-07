# Dashboard Top Profit & Sales Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement two top KPI cards (Net Sales and Estimated Profit) in `TopKPICards.tsx` on the Owner Dashboard.

**Architecture:** Update `TopKPICards.tsx` to query `payments` (for subtotal, discount, net amount) and `item_ingredients` (for ingredient purchase costs) within the selected date range, and render two cards in a 2-column responsive layout.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase JS, Lucide React icons, TailwindCSS.

## Global Constraints

- Files: `components/dashboard/TopKPICards.tsx`
- No breaking changes to AuthContext or database schemas.

---

### Task 1: Update TopKPICards component to fetch revenue, discounts, ingredient costs and render 2 KPI cards

**Files:**
- Modify: `components/dashboard/TopKPICards.tsx`

**Interfaces:**
- Consumes: `startDate: Date`, `endDate: Date`, `refreshKey: number` from `OwnerDashboard`
- Produces: 2 KPI Cards rendering Net Sales (with gross sales & discount breakdown) and Estimated Profit (with net sales & ingredient cost breakdown).

- [ ] **Step 1: Update implementation of TopKPICards**

```tsx
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
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            ยอดขายสุทธิ
          </span>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
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
              <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">฿</span>
            </p>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-neutral-500 mt-1">
              (ก่อนหักโปร ฿{data.grossSales.toLocaleString()} • ส่วนลด ฿{data.totalDiscounts.toLocaleString()})
            </p>
          </div>
        )}
      </Card>

      {/* Card 2: กำไรประมาณการ (Estimated Profit) */}
      <Card className="p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            กำไรประมาณการ
          </span>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
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
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-neutral-100">
              {data.estimatedProfit.toLocaleString()}{' '}
              <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">฿</span>
            </p>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-neutral-500 mt-1">
              (ยอดขายสุทธิ ฿{data.netRevenue.toLocaleString()} • จัดซื้อ ฿{data.totalIngredientCost.toLocaleString()})
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `pnpm exec tsc --noEmit`
Expected: PASS with 0 errors
