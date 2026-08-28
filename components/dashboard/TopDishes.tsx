"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { storeTimestampRange } from '@/lib/storeDateRange';
import { Award } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface TopDishesProps {
  startDate: Date;
  endDate: Date;
  refreshKey: number;
}

interface DishRank {
  name: string;
  totalQty: number;
  totalRevenue: number;
}

export const TopDishes: React.FC<TopDishesProps> = ({ startDate, endDate, refreshKey }) => {
  const [dishes, setDishes] = useState<DishRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { startISO, endISO } = storeTimestampRange(startDate, endDate);

        const { data: items } = await supabase
          .from('order_items')
          .select('quantity, unit_price, menu_items(name)')
          .neq('status', 'voided')
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        const menuMap: Record<string, { qty: number; rev: number }> = {};
        (items || []).forEach((item: any) => {
          const name = item.menu_items?.name || 'อื่นๆ';
          if (!menuMap[name]) menuMap[name] = { qty: 0, rev: 0 };
          menuMap[name].qty += item.quantity;
          menuMap[name].rev += item.quantity * item.unit_price;
        });

        const sorted = Object.entries(menuMap)
          .map(([name, val]) => ({ name, totalQty: val.qty, totalRevenue: val.rev }))
          .sort((a, b) => b.totalQty - a.totalQty)
          .slice(0, 8);

        setDishes(sorted);
      } catch (err) {
        console.error('TopDishes fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [startDate, endDate, refreshKey]);

  const maxQty = dishes.length > 0 ? dishes[0].totalQty : 1;

  // Food emojis for visual flair
  const foodEmojis = ['🍖', '🍗', '🍣', '🍜', '🥩', '🍛', '🍤', '🥗'];

  return (
    <Card className="p-5 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4.5 h-4.5 text-amber-500" />
          <span className="text-sm font-extrabold text-slate-900 dark:text-neutral-100">
            8 อันดับอาหารขายดี
          </span>
        </div>
        <span className="text-card-sublabel">Top Dishes</span>
      </div>

      <div className="flex-1 space-y-0 divide-y divide-slate-100 dark:divide-neutral-800">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
                <div className="h-2 w-full bg-slate-100 dark:bg-neutral-800 rounded-full animate-pulse" />
              </div>
            </div>
          ))
        ) : dishes.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-neutral-500 py-6 text-center">ยังไม่มีข้อมูลการขาย</p>
        ) : (
          dishes.map((dish, idx) => {
            const widthPercent = (dish.totalQty / maxQty) * 100;
            return (
              <div key={dish.name} className="py-3 flex items-center gap-3">
                {/* Rank + Emoji */}
                <div className="relative shrink-0">
                  <span className="text-2xl">{foodEmojis[idx] || '🍽️'}</span>
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-md bg-gradient-to-br from-red-500 to-red-700 text-white text-xs font-black flex items-center justify-center shadow-sm">
                    {idx + 1}
                  </span>
                </div>

                {/* Name + Progress Bar */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-neutral-100 truncate">
                      {dish.name}
                    </span>
                    <span className="text-sm font-black text-red-600 dark:text-red-400 shrink-0 ml-2">
                      {dish.totalQty} <span className="text-card-unit">จาน</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-700"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
