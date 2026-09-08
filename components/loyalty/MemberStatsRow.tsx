"use client";

import React from 'react';
import { Banknote, CalendarDays, TrendingUp, Users } from 'lucide-react';
import type { MemberStats } from './memberProfileTypes';

interface MemberStatsRowProps {
  stats: MemberStats;
  formatDate: (dateStr: string) => string;
  loading?: boolean;
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700 rounded-xl p-3.5 space-y-1">
      <div className="flex items-center gap-1.5">
        <span className={accent}>{icon}</span>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
          {label}
        </span>
      </div>
      <p className="text-base md:text-lg font-black text-slate-900 dark:text-neutral-100 leading-tight">
        {value}
      </p>
    </div>
  );
}

export const MemberStatsRow: React.FC<MemberStatsRowProps> = ({
  stats,
  formatDate,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[72px] bg-white/60 dark:bg-neutral-900/60 border border-slate-200/60 dark:border-neutral-700/60 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  const lastVisit = stats.last_visit_at ? formatDate(stats.last_visit_at) : '—';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="ยอดรวม"
        value={`${stats.lifetime_spend.toLocaleString()} ฿`}
        icon={<Banknote className="w-3.5 h-3.5" />}
        accent="text-emerald-600 dark:text-emerald-400"
      />
      <StatCard
        label="จำนวนครั้งที่มา"
        value={`${stats.visit_count.toLocaleString()} ครั้ง`}
        icon={<Users className="w-3.5 h-3.5" />}
        accent="text-blue-600 dark:text-blue-400"
      />
      <StatCard
        label="ครั้งล่าสุด"
        value={lastVisit}
        icon={<CalendarDays className="w-3.5 h-3.5" />}
        accent="text-violet-600 dark:text-violet-400"
      />
      <StatCard
        label="เฉลี่ย/บิล"
        value={`${stats.avg_per_bill.toLocaleString()} ฿`}
        icon={<TrendingUp className="w-3.5 h-3.5" />}
        accent="text-amber-600 dark:text-amber-400"
      />
    </div>
  );
};
