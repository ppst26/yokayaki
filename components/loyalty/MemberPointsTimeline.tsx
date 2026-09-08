"use client";

import React from 'react';
import { Clock, Gift, MinusCircle, PlusCircle } from 'lucide-react';
import type { PointEvent } from './memberProfileTypes';

interface MemberPointsTimelineProps {
  events: PointEvent[];
  loading?: boolean;
  formatDate: (dateStr: string) => string;
  formatTime: (dateStr: string) => string;
}

export const MemberPointsTimeline: React.FC<MemberPointsTimelineProps> = ({
  events,
  loading = false,
  formatDate,
  formatTime,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-neutral-800/50 border border-slate-200/80 dark:border-neutral-700/60 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        ประวัติแต้มทั้งหมด
      </h3>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-neutral-500 text-center py-8">
          ยังไม่มีประวัติแต้ม
        </p>
      ) : (
        <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
          {events.map((event, idx) => {
            const key = `${event.kind}-${event.at}-${idx}`;

            if (event.kind === 'earn') {
              return (
                <div
                  key={key}
                  className="p-3 bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700 rounded-xl text-xs space-y-1 shadow-2xs"
                >
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5" />
                      +{event.points} แต้ม
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-semibold">
                      จากบิล ORD-{event.order_id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-semibold">
                    {formatDate(event.at)} {formatTime(event.at)} น.
                  </p>
                </div>
              );
            }

            if (event.kind === 'redeem') {
              return (
                <div
                  key={key}
                  className="p-3 bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700 rounded-xl text-xs space-y-1 shadow-2xs"
                >
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <MinusCircle className="w-3.5 h-3.5" />
                      ใช้ {event.points} แต้ม
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-semibold">
                      บิล ORD-{event.order_id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-semibold">
                    {formatDate(event.at)} {formatTime(event.at)} น.
                  </p>
                </div>
              );
            }

            return (
              <div
                key={key}
                className="p-3 bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700 rounded-xl text-xs space-y-1 shadow-2xs"
              >
                <div className="flex justify-between items-center font-bold">
                  <span
                    className={
                      event.points > 0
                        ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5'
                        : 'text-rose-600 dark:text-rose-400 flex items-center gap-1.5'
                    }
                  >
                    <Gift className="w-3.5 h-3.5" />
                    {event.points > 0 ? '+' : ''}
                    {event.points} แต้ม
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-semibold">
                    โดย: {event.by}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-neutral-300 font-semibold">
                  เหตุผล: {event.reason}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-semibold">
                  {formatDate(event.at)} {formatTime(event.at)} น.
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
