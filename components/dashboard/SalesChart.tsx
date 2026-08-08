"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts';

interface SalesChartProps {
  startDate: Date;
  endDate: Date;
  refreshKey: number;
}

interface ChartBar {
  key: string;
  label: string;
  subLabel?: string;
  revenue: number;
  billCount: number;
}

const chartConfig = {
  revenue: {
    label: "ยอดขายสุทธิ",
    color: "#dc2626",
  },
} satisfies ChartConfig;

export const SalesChart: React.FC<SalesChartProps> = ({ startDate, endDate, refreshKey }) => {
  const [bars, setBars] = useState<ChartBar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalesData = async () => {
      setLoading(true);
      try {
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        const { data: payments, error } = await supabase
          .from('payments')
          .select('net_amount, created_at')
          .gte('created_at', startISO)
          .lte('created_at', endISO)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const paymentsList = payments || [];
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

        let generatedBars: ChartBar[] = [];

        if (diffDays <= 2) {
          // 1. วันนี้ / เมื่อวาน: 7 สล็อตชั่วโมงหลัก (17:00 - 23:00)
          const hours = [17, 18, 19, 20, 21, 22, 23];
          generatedBars = hours.map(h => ({
            key: `hour_${h}`,
            label: `${h.toString().padStart(2, '0')}:00`,
            revenue: 0,
            billCount: 0,
          }));

          paymentsList.forEach((p: any) => {
            const d = new Date(p.created_at);
            const h = d.getHours();
            const hourKey = `hour_${h}`;
            let slot = generatedBars.find(s => s.key === hourKey);
            if (!slot) {
              slot = {
                key: hourKey,
                label: `${h.toString().padStart(2, '0')}:00`,
                revenue: 0,
                billCount: 0,
              };
              generatedBars.push(slot);
            }
            slot.revenue += parseFloat(p.net_amount || 0);
            slot.billCount++;
          });

          generatedBars.sort((a, b) => parseInt(a.key.replace('hour_', '')) - parseInt(b.key.replace('hour_', '')));
        } else if (diffDays <= 7) {
          // 2. สัปดาห์นี้: 7 สล็อตวัน (จันทร์ - อาทิตย์)
          const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
          const tempMap: Record<string, ChartBar> = {};

          const cur = new Date(startDate);
          cur.setHours(0, 0, 0, 0);

          for (let i = 0; i < 7; i++) {
            const dateKey = cur.toISOString().split('T')[0];
            const dayName = dayNames[cur.getDay()];
            tempMap[dateKey] = {
              key: dateKey,
              label: dayName,
              subLabel: `${cur.getDate()}/${cur.getMonth() + 1}`,
              revenue: 0,
              billCount: 0,
            };
            cur.setDate(cur.getDate() + 1);
          }

          paymentsList.forEach((p: any) => {
            const dateKey = p.created_at.split('T')[0];
            if (tempMap[dateKey]) {
              tempMap[dateKey].revenue += parseFloat(p.net_amount || 0);
              tempMap[dateKey].billCount++;
            }
          });

          generatedBars = Object.values(tempMap);
        } else {
          // 3. เดือนนี้ / กำหนดเอง (> 7 วัน): สล็อตรายวัน (1 - 31) แบบ Scrollable
          const tempMap: Record<string, ChartBar> = {};

          const cur = new Date(startDate);
          cur.setHours(0, 0, 0, 0);
          const endBoundary = new Date(endDate);

          while (cur <= endBoundary) {
            const dateKey = cur.toISOString().split('T')[0];
            tempMap[dateKey] = {
              key: dateKey,
              label: `${cur.getDate()}/${cur.getMonth() + 1}`,
              revenue: 0,
              billCount: 0,
            };
            cur.setDate(cur.getDate() + 1);
          }

          paymentsList.forEach((p: any) => {
            const dateKey = p.created_at.split('T')[0];
            if (tempMap[dateKey]) {
              tempMap[dateKey].revenue += parseFloat(p.net_amount || 0);
              tempMap[dateKey].billCount++;
            }
          });

          generatedBars = Object.values(tempMap);
        }

        setBars(generatedBars);
      } catch (err) {
        console.error('SalesChart fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [startDate, endDate, refreshKey]);

  const peakIdx = bars.reduce((maxI, b, idx, arr) => (b.revenue > (arr[maxI]?.revenue || 0) ? idx : maxI), 0);
  const totalRevenue = bars.reduce((s, b) => s + b.revenue, 0);
  const isManyBars = bars.length > 10;

  return (
    <Card className="p-5 space-y-4 h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-extrabold text-slate-900 dark:text-neutral-100 block leading-tight">
              ภาพรวมยอดขาย
            </span>
            <span className="text-card-sublabel">
              {bars.length} แท่ง • ยอดรวม ฿{totalRevenue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end min-h-[220px] relative">
          <div className={`w-full ${isManyBars ? 'overflow-x-auto no-scrollbar scroll-smooth' : ''}`}>
            <div className={`h-[210px] ${isManyBars ? 'min-w-[650px]' : 'w-full'}`}>
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={bars} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200/80 dark:stroke-neutral-800/80" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs font-bold fill-slate-500 dark:fill-neutral-400"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : val)}
                    className="text-xs font-bold fill-slate-400 dark:fill-neutral-500"
                  />
                  <ChartTooltip
                    cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                    content={
                      <ChartTooltipContent
                        formatter={(val, _name, item) => (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-black text-red-600 dark:text-red-400">
                              ฿{Number(val).toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">
                              {item.payload.billCount} บิล ({item.payload.label})
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {bars.map((entry, index) => {
                      const isPeak = index === peakIdx && entry.revenue > 0;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isPeak ? '#ef4444' : entry.revenue > 0 ? '#dc2626' : '#e2e8f0'}
                          className="transition-all duration-200 hover:opacity-80 cursor-pointer"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
