"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SalesChartProps {
  startDate: Date;
  endDate: Date;
  refreshKey: number;
}

interface ChartBar {
  label: string;
  revenue: number;
  billCount: number;
}

export const SalesChart: React.FC<SalesChartProps> = ({ startDate, endDate, refreshKey }) => {
  const [bars, setBars] = useState<ChartBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        const { data: payments } = await supabase
          .from('payments')
          .select('net_amount, created_at')
          .gte('created_at', startISO)
          .lte('created_at', endISO)
          .order('created_at', { ascending: true });

        if (!payments || payments.length === 0) {
          setBars([]);
          setLoading(false);
          return;
        }

        // Determine grouping: by hour (if single day) or by day
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const useHourly = diffDays <= 1.5;

        const grouped: Record<string, { revenue: number; billCount: number }> = {};

        payments.forEach((p: any) => {
          const d = new Date(p.created_at);
          let key: string;
          if (useHourly) {
            key = `${d.getHours().toString().padStart(2, '0')}:00`;
          } else {
            key = `${d.getDate()}/${d.getMonth() + 1}`;
          }
          if (!grouped[key]) grouped[key] = { revenue: 0, billCount: 0 };
          grouped[key].revenue += parseFloat(p.net_amount);
          grouped[key].billCount++;
        });

        const result = Object.entries(grouped).map(([label, val]) => ({
          label,
          revenue: val.revenue,
          billCount: val.billCount,
        }));

        setBars(result);
      } catch (err) {
        console.error('SalesChart fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [startDate, endDate, refreshKey]);

  const maxRevenue = Math.max(...bars.map(b => b.revenue), 1);

  // Auto-scale Y-axis gridlines
  const yStep = Math.ceil(maxRevenue / 4 / 100) * 100 || 250;
  const yMax = yStep * 4;
  const gridLines = Array.from({ length: 5 }, (_, i) => yStep * i);

  return (
    <Card className="p-5 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-red-500" />
          <span className="text-sm font-extrabold text-slate-900 dark:text-neutral-100">
            ภาพรวมยอดขาย
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500">Sales Overview</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bars.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-slate-400 dark:text-neutral-500">ยังไม่มีข้อมูลยอดขายในช่วงนี้</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chart Area */}
          <div className="flex-1 flex items-end relative" ref={chartRef}>
            {/* Y-axis gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {gridLines.slice().reverse().map((val, i) => (
                <div key={i} className="flex items-center w-full">
                  <span className="text-[9px] font-bold text-slate-300 dark:text-neutral-600 w-10 text-right pr-2 shrink-0">
                    {val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : val}
                  </span>
                  <div className="flex-1 border-t border-dashed border-slate-100 dark:border-neutral-800" />
                </div>
              ))}
            </div>

            {/* Bars */}
            <div className="flex items-end gap-1 sm:gap-2 w-full pl-12 pb-1 relative z-10">
              {bars.map((bar, idx) => {
                const heightPercent = Math.max(4, (bar.revenue / yMax) * 100);
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center relative group"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Tooltip */}
                    {hoveredIdx === idx && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 bg-slate-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl px-3 py-2 text-center whitespace-nowrap shadow-lg pointer-events-none">
                        <p className="text-xs font-black">฿{bar.revenue.toLocaleString()}</p>
                        <p className="text-[10px] font-bold opacity-70">{bar.billCount} บิล</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900 dark:border-t-neutral-100" />
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-red-600 to-rose-400 transition-all duration-500 cursor-pointer hover:from-red-700 hover:to-rose-500 min-h-[4px]"
                      style={{ height: `${heightPercent}%`, maxHeight: '200px' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex gap-1 sm:gap-2 pl-12 mt-1">
            {bars.map((bar, idx) => (
              <div key={idx} className="flex-1 text-center">
                <span className={`text-[9px] font-bold ${
                  hoveredIdx === idx
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-400 dark:text-neutral-500'
                }`}>
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
