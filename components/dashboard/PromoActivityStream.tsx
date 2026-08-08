"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BadgePercent, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface PromoActivityStreamProps {
  startDate: Date;
  endDate: Date;
  refreshKey: number;
}

interface TopPromo {
  name: string;
  usageCount: number;
  totalDiscount: number;
}

interface PromoEntry {
  name: string;
  usageCount: number;
  totalDiscount: number;
}

export const PromoActivityStream: React.FC<PromoActivityStreamProps> = ({ startDate, endDate, refreshKey }) => {
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [topPromo, setTopPromo] = useState<TopPromo | null>(null);
  const [promoList, setPromoList] = useState<PromoEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        // Total discount amount
        const { data: discountData } = await supabase
          .from('payments')
          .select('discount_amount')
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        const total = (discountData || []).reduce((s, p) => s + parseFloat(p.discount_amount as any), 0);
        setTotalDiscount(total);

        // All promotions used in period
        const { data: promoData } = await supabase
          .from('payment_promotions')
          .select('promotion_name, discount_value')
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        if (promoData && promoData.length > 0) {
          const promoMap: Record<string, { count: number; discount: number }> = {};
          promoData.forEach((p: any) => {
            const name = p.promotion_name;
            if (!promoMap[name]) promoMap[name] = { count: 0, discount: 0 };
            promoMap[name].count++;
            promoMap[name].discount += parseFloat(p.discount_value);
          });
          const sorted = Object.entries(promoMap)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([name, v]) => ({ name, usageCount: v.count, totalDiscount: v.discount }));

          setTopPromo(sorted[0] ?? null);
          setPromoList(sorted);
        } else {
          setTopPromo(null);
          setPromoList([]);
        }
      } catch (err) {
        console.error('PromoActivityStream fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [startDate, endDate, refreshKey]);

  return (
    <Card className="p-5 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BadgePercent className="w-4 h-4 text-rose-500" />
          <span className="text-sm font-extrabold text-slate-900 dark:text-neutral-100">
            ยอดโปรโมชั่นใช้ทั้งหมด
          </span>
        </div>
      </div>

      {/* Total Discount Summary */}
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

      {/* Top Promotion Highlight */}
      <div className="flex items-center gap-2 pt-1">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-card-label">
          โปรโมชั่นยอดฮิต
        </span>
      </div>

      {/* Promotion List */}
      <div className="flex-1 space-y-0 divide-y divide-slate-100 dark:divide-neutral-800">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-3 flex items-center gap-3">
              <div className="h-4 w-full bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            </div>
          ))
        ) : promoList.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-neutral-500 py-4 text-center">ยังไม่มีการใช้โปรโมชั่น</p>
        ) : (
          promoList.map((promo, idx) => (
            <div key={promo.name} className="py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0
                  ${idx === 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' :
                    idx === 1 ? 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400' :
                    'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'}`}
                >
                  {idx + 1}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-neutral-100 truncate">{promo.name}</span>
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
