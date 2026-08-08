"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, TrendingUp, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';

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

export const SalesChart: React.FC<SalesChartProps> = ({ startDate, endDate, refreshKey }) => {
  const [bars, setBars] = useState<ChartBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

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
              // กรณีมีออเดอร์นอกเวลา 17-23 (เช่น 16:00 หรือ 00:00) ให้เพิ่มสล็อตอัตโนมัติ
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

          // จัดเรียงสล็อตชั่วโมงตามลำดับ
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

  const maxRevenue = Math.max(...bars.map(b => b.revenue), 1);
  const peakIdx = bars.reduce((maxI, b, idx, arr) => (b.revenue > (arr[maxI]?.revenue || 0) ? idx : maxI), 0);
  const hasSales = bars.some(b => b.revenue > 0);

  // คำนวณแกน Y อัตโนมัติ
  const yStep = Math.ceil(maxRevenue / 4 / 100) * 100 || 250;
  const yMax = yStep * 4;
  const gridLines = Array.from({ length: 5 }, (_, i) => yStep * i);

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
            <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500">
              {bars.length} แท่ง • ยอดรวม ฿{bars.reduce((s, b) => s + b.revenue, 0).toLocaleString()}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase tracking-wider bg-slate-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full">
          Bar Chart
        </span>
      </div>

      {/* Chart Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end min-h-[190px] relative">
          {/* Main Container: Y-Axis + Bars */}
          <div className="flex items-end flex-1 relative" ref={chartRef}>
            
            {/* Fixed Y-Axis Labels & Dashed Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
              {gridLines.slice().reverse().map((val, i) => (
                <div key={i} className="flex items-center w-full">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 w-9 text-right pr-1.5 shrink-0">
                    {val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : val}
                  </span>
                  <div className="flex-1 border-t border-dashed border-slate-200/80 dark:border-neutral-800/80" />
                </div>
              ))}
            </div>

            {/* Bars Wrapper Container (Scrollable when many bars) */}
            <div className="pl-10 w-full overflow-x-auto no-scrollbar scroll-smooth relative z-10 pt-12 pb-0.5">
              <div className={`flex items-end gap-1.5 sm:gap-2.5 h-[160px] ${isManyBars ? 'min-w-[640px]' : 'w-full'}`}>
                {bars.map((bar, idx) => {
                  const heightPercent = bar.revenue > 0 ? Math.max(8, (bar.revenue / yMax) * 82) : 3;
                  const isHovered = hoveredIdx === idx;
                  const isPeak = hasSales && idx === peakIdx && bar.revenue > 0;

                  return (
                    <div
                      key={bar.key}
                      className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
                    >
                      {/* Tooltip on Hover / Touch */}
                      {isHovered && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 bg-slate-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl px-3 py-1.5 text-center whitespace-nowrap shadow-xl pointer-events-none animate-in fade-in-50 zoom-in-95 duration-100">
                          <p className="text-[11px] font-black leading-tight">฿{bar.revenue.toLocaleString()}</p>
                          <p className="text-[9px] font-extrabold opacity-75">{bar.billCount} บิล ({bar.label})</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900 dark:border-t-neutral-100" />
                        </div>
                      )}

                      {/* Peak Sales Indicator Icon */}
                      {isPeak && !isHovered && (
                        <div className="absolute bottom-full mb-1 text-red-500 animate-bounce">
                          <Sparkles className="w-3 h-3 fill-red-500" />
                        </div>
                      )}

                      {/* Bar Pillar */}
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          bar.revenue > 0
                            ? isPeak
                              ? 'bg-gradient-to-t from-red-600 via-rose-500 to-amber-400 shadow-xs shadow-red-500/30'
                              : 'bg-gradient-to-t from-red-600 to-rose-400 hover:from-red-700 hover:to-rose-500'
                            : 'bg-slate-200/70 dark:bg-neutral-800/80 hover:bg-slate-300 dark:hover:bg-neutral-700'
                        } ${isHovered ? 'ring-2 ring-red-400 dark:ring-red-500 ring-offset-1 scale-x-105' : ''}`}
                        style={{ height: `${heightPercent}%` }}
                      />

                      {/* X-Axis Label */}
                      <div className="mt-1.5 text-center w-full">
                        <span className={`block text-[10px] font-black truncate leading-none ${
                          isHovered
                            ? 'text-red-600 dark:text-red-400 font-extrabold'
                            : isPeak
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-slate-500 dark:text-neutral-400'
                        }`}>
                          {bar.label}
                        </span>
                        {bar.subLabel && (
                          <span className="block text-[8px] font-bold text-slate-400 dark:text-neutral-500 mt-0.5 leading-none">
                            {bar.subLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </Card>
  );
};
