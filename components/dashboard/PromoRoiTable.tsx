"use client";

import React from 'react';
import { Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import type { PromoRoiRow } from '@/lib/retentionAnalytics';

interface PromoRoiTableProps {
  rows: PromoRoiRow[];
  loading: boolean;
}

function formatBaht(n: number) {
  return Math.round(n).toLocaleString('th-TH');
}

export const PromoRoiTable: React.FC<PromoRoiTableProps> = ({ rows, loading }) => {
  return (
    <Card className="p-5 h-full flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
          <Tag className="w-4 h-4 text-red-500" />
          Promo ROI
        </h2>
        <p className="text-caption mt-0.5">
          ส่วนลดที่จ่าย vs ยอดบิลที่ใช้โปร (ROI = ยอดบิล ÷ ส่วนลด)
        </p>
      </div>

      {loading ? (
        <div className="h-32 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="text-xs font-semibold text-slate-400 dark:text-neutral-500 py-6 text-center">
          ยังไม่มีโปรโมชั่นในช่วงนี้
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>โปรโมชั่น</TableHead>
                <TableHead className="text-right">ครั้ง</TableHead>
                <TableHead className="text-right">ส่วนลด</TableHead>
                <TableHead className="text-right">ยอดบิล</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.promotion_id}>
                  <TableCell className="font-bold max-w-[140px] truncate">{row.name}</TableCell>
                  <TableCell className="text-right font-semibold">{row.uses}</TableCell>
                  <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400">
                    −{formatBaht(row.discount_total)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatBaht(row.sales_with_promo)}
                  </TableCell>
                  <TableCell className="text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                    {row.roi === null ? '—' : `${row.roi.toLocaleString('th-TH')}×`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
};
