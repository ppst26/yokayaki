"use client";

import React, { useMemo } from 'react';
import { BadgePercent, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { DashboardBundle } from '@/lib/useDashboardBundle';

interface PromoActivityStreamProps {
  bundle: DashboardBundle;
}

export const PromoActivityStream: React.FC<PromoActivityStreamProps> = ({ bundle }) => {
  const { payments, promos, loading } = bundle;

  const totalDiscount = useMemo(
    () => payments.reduce((s, p) => s + parseFloat(String(p.discount_amount)), 0),
    [payments],
  );

  const promoList = useMemo(() => {
    if (promos.length === 0) return [];
    const promoMap: Record<string, { count: number; discount: number }> = {};
    promos.forEach(p => {
      const name = p.promotion_name;
      if (!promoMap[name]) promoMap[name] = { count: 0, discount: 0 };
      promoMap[name].count++;
      promoMap[name].discount += parseFloat(String(p.discount_value));
    });
    return Object.entries(promoMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, v]) => ({ name, usageCount: v.count, totalDiscount: v.discount }));
  }, [promos]);

  return (
    <Card className="p-5 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BadgePercent className="w-4 h-4 text-rose-500" />
          <span className="text-sm font-extrabold text-slate-900 dark:text-neutral-100">
            ยอดโปรโมชั่นใช้ทั้งหมด
          </span>
        </div>
      </div>

      {loading ? (
        <div className="h-10 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
      ) : (
        <div className="border border-slate-200/80 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 rounded-2xl p-4">
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {totalDiscount.toLocaleString()}{' '}
            <span className="text-sm font-bold text-rose-400 dark:text-rose-500">฿</span>
          </p>
          <p className="text-card-sublabel mt-0.5">ส่วนลดที่ใช้ไปในช่วงนี้ (ค่าใช้จ่ายโปรโมชั่น)</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-card-label">โปรโมชั่นยอดฮิต</span>
      </div>

      <div className="flex-1 space-y-0 divide-y divide-slate-100 dark:divide-neutral-800">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-3 flex items-center gap-3">
              <div className="h-4 w-full bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            </div>
          ))
        ) : promoList.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-neutral-500 py-4 text-center">
            ยังไม่มีการใช้โปรโมชั่น
          </p>
        ) : (
          promoList.map((promo, idx) => (
            <div key={promo.name} className="py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0
                  ${
                    idx === 0
                      ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                      : idx === 1
                        ? 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400'
                        : 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-neutral-100 truncate">
                  {promo.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                  {promo.usageCount} ครั้ง
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">
                  -{promo.totalDiscount.toLocaleString()}฿
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
