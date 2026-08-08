"use client";

import React, { useState } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { useDateFilter } from '@/lib/useDateFilter';
import { DateFilterBar } from '@/components/dashboard/DateFilterBar';
import { TopKPICards } from '@/components/dashboard/TopKPICards';
import { BusinessSpotlight } from '@/components/dashboard/BusinessSpotlight';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { BusinessKPIs } from '@/components/dashboard/BusinessKPIs';
import { PromoActivityStream } from '@/components/dashboard/PromoActivityStream';
import { TopDishes } from '@/components/dashboard/TopDishes';

export const OwnerDashboard: React.FC = () => {
  const {
    datePreset,
    customStartDate,
    customEndDate,
    startDate,
    endDate,
    setDatePreset,
    setCustomStartDate,
    setCustomEndDate,
  } = useDateFilter();

  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-slate-900 dark:text-neutral-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
            แดชบอร์ดเจ้าของร้าน
          </h1>
          <p className="text-caption mt-0.5">
            ภาพรวมผลประกอบการ • ยอดขาย • โปรโมชั่น • CRM
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar
        datePreset={datePreset}
        onPresetChange={setDatePreset}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartChange={setCustomStartDate}
        onCustomEndChange={setCustomEndDate}
      />

      {/* ══════════════════════════════════════════════════════════
          Main Dashboard Grid — matches reference layout:
          ┌──────────┬──────────┬──────────┬──────────────┐
          │  KPI 1   │  KPI 2   │  KPI 3   │  Spotlight   │
          │          │          │          │  (row-span2) │
          ├──────────┴──────────┼──────────┤              │
          │   Sales Chart       │ Biz KPIs │              │
          │                     │          │              │
          ├──────────┬──────────┼──────────┴──────────────┤
          │  Promo Activity     │      Top 8 Dishes       │
          │  Stream             │                         │
          └──────────┴──────────┴─────────────────────────┘
         ══════════════════════════════════════════════════════════ */}

      {/* Desktop: 4-column grid | Mobile: stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_320px] gap-4 lg:gap-5">

        {/* ─── Row 1, Cols 1-3: Top 3 KPI Cards ─── */}
        <div className="lg:col-span-3">
          <TopKPICards startDate={startDate} endDate={endDate} refreshKey={refreshKey} />
        </div>

        {/* ─── Row 1-2, Col 4: Business Spotlight (spans 2 rows) ─── */}
        <div className="lg:row-span-2 h-full flex flex-col">
          <BusinessSpotlight startDate={startDate} endDate={endDate} refreshKey={refreshKey} />
        </div>

        {/* ─── Row 2, Cols 1-2: Sales Chart ─── */}
        <div className="lg:col-span-2 min-h-[320px] h-full flex flex-col">
          <SalesChart startDate={startDate} endDate={endDate} refreshKey={refreshKey} />
        </div>

        {/* ─── Row 2, Col 3: Business KPIs ─── */}
        <div className="h-full flex flex-col">
          <BusinessKPIs startDate={startDate} endDate={endDate} refreshKey={refreshKey} />
        </div>

        {/* ─── Row 3, Cols 1-2: Promo Activity Stream ─── */}
        <div className="lg:col-span-2 h-full flex flex-col">
          <PromoActivityStream startDate={startDate} endDate={endDate} refreshKey={refreshKey} />
        </div>

        {/* ─── Row 3, Cols 3-4: Top 8 Dishes ─── */}
        <div className="lg:col-span-2 h-full flex flex-col">
          <TopDishes startDate={startDate} endDate={endDate} refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
};
