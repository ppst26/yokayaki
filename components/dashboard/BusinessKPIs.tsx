"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Tag, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BusinessKPIsProps {
  startDate: Date;
  endDate: Date;
  refreshKey: number;
}

interface KPIValues {
  totalMembers: number;
  activePromos: number;
  totalPointsRedeemed: number;
}

export const BusinessKPIs: React.FC<BusinessKPIsProps> = ({ startDate, endDate, refreshKey }) => {
  const [data, setData] = useState<KPIValues>({ totalMembers: 0, activePromos: 0, totalPointsRedeemed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        // Total Loyalty Members
        const { count: memberCount } = await supabase
          .from('loyalty_members')
          .select('*', { count: 'exact', head: true });

        // Active Promotions
        const { count: promoCount } = await supabase
          .from('promotions')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Total Points Redeemed in date range
        const { data: payments } = await supabase
          .from('payments')
          .select('points_redeemed')
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        const totalPointsRedeemed = (payments || []).reduce((s, p) => s + (p.points_redeemed || 0), 0);

        setData({
          totalMembers: memberCount || 0,
          activePromos: promoCount || 0,
          totalPointsRedeemed,
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
      label: 'ลูกค้าสมาชิก',
      value: data.totalMembers,
      unit: 'คน',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'โปรโมชั่นเปิดใช้งาน',
      value: data.activePromos,
      unit: 'รายการ',
      icon: Tag,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
    },
    {
      label: 'แต้มที่ใช้ทั้งหมด',
      value: data.totalPointsRedeemed,
      unit: 'แต้ม',
      icon: Star,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
  ];

  return (
    <div className="space-y-4">
      {kpis.map(kpi => (
        <Card key={kpi.label} className="p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block">
              {kpi.label}
            </span>
            {loading ? (
              <div className="h-7 w-16 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ) : (
              <p className="text-xl font-black text-slate-900 dark:text-neutral-100">
                {kpi.value.toLocaleString()}{' '}
                <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500">{kpi.unit}</span>
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
