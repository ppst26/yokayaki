"use client";

import React from 'react';
import {
  type MemberTagCode,
  MEMBER_TAG_META,
  sortMemberTags,
} from '@/lib/memberTags';

interface MemberTagChipsProps {
  tags: MemberTagCode[];
  size?: 'xs' | 'sm';
  className?: string;
}

export const MemberTagChips: React.FC<MemberTagChipsProps> = ({
  tags,
  size = 'sm',
  className = '',
}) => {
  const sorted = sortMemberTags(tags);

  if (sorted.length === 0) return null;

  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'badge-pill';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {sorted.map(tag => {
        const meta = MEMBER_TAG_META[tag];
        return (
          <span
            key={tag}
            className={`${sizeClass} font-semibold border rounded-lg ${meta.className}`}
          >
            {meta.label}
          </span>
        );
      })}
    </div>
  );
};
