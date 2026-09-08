"use client";

import React from 'react';
import { BarChart3 } from 'lucide-react';
import {
  type MemberRfm,
  RFM_SEGMENT_META,
  formatRfmScores,
} from '@/lib/memberRfm';

interface MemberRfmCardProps {
  rfm: MemberRfm | null;
  loading?: boolean;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 5) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-neutral-400">
        <span>{label}</span>
        <span>{score}/5</span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-red-500 dark:bg-red-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export const MemberRfmCard: React.FC<MemberRfmCardProps> = ({ rfm, loading = false }) => {
  if (loading) {
    return (
      <div className="h-28 bg-white/60 dark:bg-neutral-900/60 border border-slate-200/60 dark:border-neutral-700/60 rounded-2xl animate-pulse" />
    );
  }

  if (!rfm) return null;

  const meta = RFM_SEGMENT_META[rfm.segment];

  return (
    <div className="bg-slate-50 dark:bg-neutral-800/50 border border-slate-200/80 dark:border-neutral-700/60 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          วิเคราะห์ RFM
        </h3>
        <span
          className={`badge-pill font-semibold border ${meta.className}`}
          title={meta.description}
        >
          {meta.label}
        </span>
      </div>

      <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
        {meta.description} · {formatRfmScores(rfm)}
        {rfm.days_inactive > 0 && (
          <span className="ml-1">· ไม่มา {rfm.days_inactive} วัน</span>
        )}
      </p>

      <div className="grid grid-cols-3 gap-3">
        <ScoreBar label="R ล่าสุด" score={rfm.r} />
        <ScoreBar label="F ความถี่" score={rfm.f} />
        <ScoreBar label="M ยอดเงิน" score={rfm.m} />
      </div>
    </div>
  );
};
