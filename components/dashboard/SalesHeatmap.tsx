"use client";

import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  HEATMAP_DOW_LABELS,
  heatmapCellMap,
  heatmapDisplayHours,
  heatmapIntensity,
  type RetentionHeatmap,
} from '@/lib/retentionAnalytics';

interface SalesHeatmapProps {
  heatmap: RetentionHeatmap;
  loading: boolean;
}

const CELL = '1.375rem';

export const SalesHeatmap: React.FC<SalesHeatmapProps> = ({ heatmap, loading }) => {
  const { hours, maxNet, cellMap } = useMemo(() => {
    const displayHours = heatmapDisplayHours(heatmap.cells);
    const max = heatmap.cells.reduce((m, c) => Math.max(m, c.net), 0);
    return {
      hours: displayHours,
      maxNet: max,
      cellMap: heatmapCellMap(heatmap.cells),
    };
  }, [heatmap.cells]);

  return (
    <Card className="flex h-full min-w-0 flex-col gap-3 p-5">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-neutral-100">
          <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
          Heatmap ยอดขาย
        </h2>
        <p className="text-caption mt-0.5">วันในสัปดาห์ × ชั่วโมง (เข้ม = ยอดสูง)</p>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-neutral-800" />
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <div
            className="grid w-max min-w-full gap-0.5"
            style={{
              gridTemplateColumns: `1.75rem repeat(${hours.length}, ${CELL})`,
              gridAutoRows: CELL,
            }}
          >
            <div />
            {hours.map(h => (
              <div
                key={`h-${h}`}
                className="flex items-end justify-center pb-0.5 text-[9px] font-bold tabular-nums text-slate-400 dark:text-neutral-500"
              >
                {h}
              </div>
            ))}

            {HEATMAP_DOW_LABELS.map((label, dow) => (
              <React.Fragment key={label}>
                <div className="flex items-center text-[10px] font-extrabold text-slate-500 dark:text-neutral-400">
                  {label}
                </div>
                {hours.map(hour => {
                  const cell = cellMap.get(`${dow}-${hour}`);
                  const intensity = heatmapIntensity(cell?.net ?? 0, maxNet);
                  const title = cell
                    ? `${label} ${hour}:00 — ${Math.round(cell.net).toLocaleString()} ฿ (${cell.bills} บิล)`
                    : `${label} ${hour}:00 — ไม่มียอด`;

                  return (
                    <div
                      key={`${dow}-${hour}`}
                      title={title}
                      className="rounded-sm border border-slate-100/80 dark:border-neutral-800/80"
                      style={{
                        backgroundColor:
                          intensity <= 0
                            ? undefined
                            : `color-mix(in srgb, var(--color-red-600) ${Math.round(intensity * 85 + 15)}%, transparent)`,
                      }}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-slate-400 dark:text-neutral-500">
            <span>น้อย</span>
            <div className="flex gap-0.5">
              {[0.15, 0.35, 0.55, 0.75, 0.95].map(i => (
                <div
                  key={i}
                  className="h-3 w-3 rounded-sm"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-red-600) ${Math.round(i * 85 + 15)}%, transparent)`,
                  }}
                />
              ))}
            </div>
            <span>มาก</span>
          </div>
        </div>
      )}
    </Card>
  );
};
