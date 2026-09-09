"use client";

import React, { useState } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { useDateFilter } from '@/lib/useDateFilter';
import { useDashboardBundle } from '@/lib/useDashboardBundle';
import { useRetentionAnalytics } from '@/lib/useRetentionAnalytics';
import { DateFilterBar } from '@/components/dashboard/DateFilterBar';
import { TopKPICards } from '@/components/dashboard/TopKPICards';
import { BusinessSpotlight } from '@/components/dashboard/BusinessSpotlight';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { BusinessKPIs } from '@/components/dashboard/BusinessKPIs';
import { PromoActivityStream } from '@/components/dashboard/PromoActivityStream';
import { TopDishes } from '@/components/dashboard/TopDishes';
import { MemberVsWalkinCard } from '@/components/dashboard/MemberVsWalkinCard';
import { PromoRoiTable } from '@/components/dashboard/PromoRoiTable';
import { SalesHeatmap } from '@/components/dashboard/SalesHeatmap';

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
  const bundle = useDashboardBundle(startDate, endDate, refreshKey);
  const retention = useRetentionAnalytics(startDate, endDate, refreshKey);

  const handleRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400 shrink-0" />
            <span>แดชบอร์ด</span>
          </h1>
          <p className="text-caption mt-0.5">ภาพรวมผลประกอบการ • ยอดขาย</p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 border border-slate-200/60 dark:border-neutral-800 rounded-xl text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${bundle.loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      <DateFilterBar
        datePreset={datePreset}
        onPresetChange={setDatePreset}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartChange={setCustomStartDate}
        onCustomEndChange={setCustomEndDate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_320px] gap-4 lg:gap-5">
        <div className="lg:col-span-3">
          <TopKPICards bundle={bundle} />
        </div>

        <div className="lg:row-span-2 h-full flex flex-col">
          <BusinessSpotlight bundle={bundle} />
        </div>

        <div className="lg:col-span-2 min-h-[320px] h-full flex flex-col">
          <SalesChart startDate={startDate} endDate={endDate} bundle={bundle} />
        </div>

        <div className="h-full flex flex-col">
          <BusinessKPIs bundle={bundle} />
        </div>

        <div className="lg:col-span-2 h-full flex flex-col">
          <PromoActivityStream bundle={bundle} />
        </div>

        <div className="lg:col-span-2 h-full flex flex-col">
          <TopDishes bundle={bundle} />
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <MemberVsWalkinCard
          data={retention.data.member_vs_walkin}
          loading={retention.loading}
        />
        <PromoRoiTable rows={retention.data.promo_roi} loading={retention.loading} />
        <SalesHeatmap heatmap={retention.data.heatmap} loading={retention.loading} />
      </div>
    </div>
  );
};
