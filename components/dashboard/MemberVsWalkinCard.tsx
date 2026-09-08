"use client";

import React from 'react';
import { Users, UserX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { MemberVsWalkin } from '@/lib/retentionAnalytics';

interface MemberVsWalkinCardProps {
  data: MemberVsWalkin;
  loading: boolean;
}

function formatBaht(n: number) {
  return Math.round(n).toLocaleString('th-TH');
}

export const MemberVsWalkinCard: React.FC<MemberVsWalkinCardProps> = ({
  data,
  loading,
}) => {
  const { member, walkin, member_share_pct } = data;

  return (
    <Card className="p-5 h-full flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-neutral-100">
          สมาชิก vs Walk-in
        </h2>
        <p className="text-caption mt-0.5">ยอดสุทธิ · จำนวนบิล · แต้มที่ใช้ในช่วงที่เลือก</p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-neutral-800" />
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-neutral-800" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <Users className="w-3.5 h-3.5" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider">สมาชิก</span>
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-neutral-100">
                {formatBaht(member.net)}{' '}
                <span className="text-xs font-bold text-slate-500">฿</span>
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
                {member.bills} บิล · ใช้ {member.points_redeemed} แต้ม
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800/60 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-neutral-300">
                <UserX className="w-3.5 h-3.5" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Walk-in</span>
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-neutral-100">
                {formatBaht(walkin.net)}{' '}
                <span className="text-xs font-bold text-slate-500">฿</span>
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
                {walkin.bills} บิล
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-neutral-400 mb-1.5">
              <span>ส่วนแบ่งยอดสมาชิก</span>
              <span className="text-emerald-600 dark:text-emerald-400">{member_share_pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, member_share_pct))}%` }}
              />
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
