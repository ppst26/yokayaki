"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { storeTimestampRange } from '@/lib/storeDateRange';
import { Users, Receipt, ShoppingBag } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BusinessKPIsProps {
  startDate: Date;
  endDate: Date;
  refreshKey: number;
}

interface KPIValues {
  totalMembers: number;
  totalBills: number;
  totalItemsSold: number;
}

export const BusinessKPIs: React.FC<BusinessKPIsProps> = ({ startDate, endDate, refreshKey }) => {
  const [data, setData] = useState<KPIValues>({ totalMembers: 0, totalBills: 0, totalItemsSold: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { startISO, endISO } = storeTimestampRange(startDate, endDate);

        // สมาชิกที่สมัครในช่วงวันที่ (L12)
        const { count: memberCount } = await supabase
          .from('loyalty_members')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        // Total Bills in date range
        const { data: payments } = await supabase
          .from('payments')
          .select('id')
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        const totalBills = (payments || []).length;

        // Total Orders (Items Sold) in date range
        const { data: items } = await supabase
          .from('order_items')
          .select('quantity')
          .neq('status', 'voided')
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        const totalItemsSold = (items || []).reduce((s, i) => s + i.quantity, 0);

        setData({
          totalMembers: memberCount || 0,
          totalBills,
          totalItemsSold,
        });
      } catch (err) {
        console.error('BusinessKPIs fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [startDate, endDate, refreshKey]);

  const kpis = [
    {
      label: 'สมาชิกใหม่',
      value: data.totalMembers,
      unit: 'คน',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'ยอดบิลทั้งหมด',
      value: data.totalBills,
      unit: 'บิล',
      icon: Receipt,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      label: 'ยอดออเดอร์ทั้งหมด',
      value: data.totalItemsSold,
      unit: 'จาน',
      icon: ShoppingBag,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/40',
    },
  ];

  return (
    <div className="h-full flex flex-col justify-between gap-3 sm:gap-4">
      {kpis.map(kpi => (
        <Card key={kpi.label} className="p-4 flex-1 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-card-label block">
              {kpi.label}
            </span>
            {loading ? (
              <div className="h-7 w-16 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ) : (
              <p className="text-xl font-black text-slate-900 dark:text-neutral-100">
                {kpi.value.toLocaleString()}{' '}
                <span className="text-card-unit">{kpi.unit}</span>
              </p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center shrink-0`}>
            <kpi.icon className="w-5 h-5" />
          </div>
        </Card>
      ))}
    </div>
  );
};
