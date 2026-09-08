"use client";

import React from 'react';
import {
  type MemberRfm,
  RFM_SEGMENT_META,
  formatRfmScores,
} from '@/lib/memberRfm';

interface MemberRfmBadgeProps {
  rfm: MemberRfm | null;
  showScores?: boolean;
  size?: 'xs' | 'sm';
}

export const MemberRfmBadge: React.FC<MemberRfmBadgeProps> = ({
  rfm,
  showScores = false,
  size = 'sm',
}) => {
  if (!rfm) return <span className="text-xs text-slate-400">—</span>;

  const meta = RFM_SEGMENT_META[rfm.segment];
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'badge-pill';

  return (
    <div className="flex flex-col items-start gap-0.5">
      <span
        className={`${sizeClass} font-semibold border rounded-lg ${meta.className}`}
        title={meta.description}
      >
        {meta.label}
      </span>
      {showScores && (
        <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500">
          {formatRfmScores(rfm)}
        </span>
      )}
    </div>
  );
};
