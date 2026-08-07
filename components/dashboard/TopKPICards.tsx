"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, Receipt, ShoppingBag } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface TopKPICardsProps {
  startDate: Date;
  endDate: Date;
  refreshKey: number;
}

interface KPIData {
  totalRevenue: number;
  totalBills: number;
  totalItemsSold: number;
}

export const TopKPICards: React.FC<TopKPICardsProps> = ({ startDate, endDate, refreshKey }) => {
  const [data, setData] = useState<KPIData>({ totalRevenue: 0, totalBills: 0, totalItemsSold: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        // Total Revenue & Bills
        const { data: payments } = await supabase
          .from('payments')
          .select('net_amount')
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        const totalRevenue = (payments || []).reduce((s, p) => s + parseFloat(p.net_amount as any), 0);
        const totalBills = (payments || []).length;

        // Total Items Sold
        const { data: items } = await supabase
          .from('order_items')
          .select('quantity')
          .neq('status', 'voided')
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        const totalItemsSold = (items || []).reduce((s, i) => s + i.quantity, 0);

        setData({ totalRevenue, totalBills, totalItemsSold });
      } catch (err) {
        console.error('TopKPICards fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [startDate, endDate, refreshKey]);

  const cards = [
    {
      label: 'ยอดขายรวม',
      value: `${data.totalRevenue.toLocaleString()}`,
      unit: '฿',
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      barColor: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
      barWidth: Math.min(100, (data.totalRevenue / 10000) * 100),
    },
    {
      label: 'ยอดบิลทั้งหมด',
      value: `${data.totalBills}`,
      unit: 'บิล',
      icon: Receipt,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      barColor: 'bg-gradient-to-r from-amber-400 to-amber-600',
      barWidth: Math.min(100, (data.totalBills / 50) * 100),
    },
    {
      label: 'ยอดออเดอร์ทั้งหมด',
      value: `${data.totalItemsSold}`,
      unit: 'จาน',
      icon: ShoppingBag,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/40',
      barColor: 'bg-gradient-to-r from-rose-400 to-red-600',
      barWidth: Math.min(100, (data.totalItemsSold / 200) * 100),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
      {cards.map(card => (
        <Card key={card.label} className="p-3 sm:p-5 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
              {card.label}
            </span>
            <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl ${card.bg} ${card.color} flex items-center justify-center shrink-0 self-start sm:self-auto`}>
              <card.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          {loading ? (
            <div className="h-6 sm:h-8 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          ) : (
            <p className="text-sm sm:text-2xl font-black text-slate-900 dark:text-neutral-100 truncate">
              {card.value}{' '}
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-neutral-400">{card.unit}</span>
            </p>
          )}
        </Card>
      ))}
    </div>
  );
};
