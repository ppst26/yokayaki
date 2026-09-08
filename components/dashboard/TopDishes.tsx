"use client";

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import type { DashboardBundle } from '@/lib/useDashboardBundle';

interface TopDishesProps {
  bundle: DashboardBundle;
}

interface DishRank {
  name: string;
  totalQty: number;
  totalRevenue: number;
}

const PER_COLUMN = 5;
const DISPLAY_COUNT = PER_COLUMN * 2;

function buildDishRanks(orderItems: DashboardBundle['orderItems']): DishRank[] {
  const menuMap: Record<string, { qty: number; rev: number }> = {};
  orderItems.forEach(item => {
    const name = item.menu_items?.name || 'อื่นๆ';
    if (!menuMap[name]) menuMap[name] = { qty: 0, rev: 0 };
    menuMap[name].qty += item.quantity;
    menuMap[name].rev += item.quantity * parseFloat(String(item.unit_price));
  });

  return Object.entries(menuMap)
    .map(([name, val]) => ({ name, totalQty: val.qty, totalRevenue: val.rev }))
    .sort((a, b) => b.totalQty - a.totalQty || b.totalRevenue - a.totalRevenue);
}

function formatBaht(n: number) {
  return Math.round(n).toLocaleString('th-TH');
}

function DishRow({ dish, rank }: { dish: DishRank; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-slate-400 dark:text-neutral-500">
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 dark:text-neutral-100">
        {dish.name}
      </span>
      <span className="shrink-0 text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
        {dish.totalQty} <span className="font-semibold text-card-unit">จาน</span>
      </span>
    </div>
  );
}

function DishColumn({
  dishes,
  startRank,
  loading,
}: {
  dishes: DishRank[];
  startRank: number;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: PER_COLUMN }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
            <div className="h-4 flex-1 animate-pulse rounded-lg bg-slate-100 dark:bg-neutral-800" />
            <div className="h-4 w-12 shrink-0 animate-pulse rounded-lg bg-slate-100 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {dishes.map((dish, idx) => (
        <DishRow key={dish.name} dish={dish} rank={startRank + idx} />
      ))}
    </div>
  );
}

export const TopDishes: React.FC<TopDishesProps> = ({ bundle }) => {
  const { orderItems, loading } = bundle;
  const [showAll, setShowAll] = useState(false);

  const allDishes = useMemo(() => buildDishRanks(orderItems), [orderItems]);
  const topDishes = allDishes.slice(0, DISPLAY_COUNT);
  const leftColumn = topDishes.slice(0, PER_COLUMN);
  const rightColumn = topDishes.slice(PER_COLUMN, DISPLAY_COUNT);
  const totalQty = allDishes.reduce((sum, d) => sum + d.totalQty, 0);

  return (
    <>
      <Card className="flex h-full flex-col p-5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-extrabold text-slate-900 dark:text-neutral-100">
            10 อันดับอาหารขายดี
          </span>
          <span className="text-card-sublabel">Top Dishes</span>
        </div>

        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              <DishColumn dishes={[]} startRank={1} loading />
              <DishColumn dishes={[]} startRank={PER_COLUMN + 1} loading />
            </div>
          ) : topDishes.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400 dark:text-neutral-500">
              ยังไม่มีข้อมูลการขาย
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              <DishColumn dishes={leftColumn} startRank={1} loading={false} />
              {rightColumn.length > 0 ? (
                <DishColumn dishes={rightColumn} startRank={PER_COLUMN + 1} loading={false} />
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>
          )}
        </div>

        {!loading && allDishes.length > DISPLAY_COUNT && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-3 w-full cursor-pointer rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            ดูเพิ่มเติม ({allDishes.length - DISPLAY_COUNT} เมนู)
          </button>
        )}
      </Card>

      {showAll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center app-dialog-backdrop p-4"
          onClick={() => setShowAll(false)}
        >
          <div
            className="app-dialog flex max-h-[85vh] w-full max-w-2xl flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-neutral-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-neutral-100">
                  อันดับเมนูขายดีทั้งหมด
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-neutral-500">
                  {allDishes.length} เมนู · รวม {totalQty.toLocaleString()} จาน · ช่วงเวลาที่เลือกในแดชบอร์ด
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="cursor-pointer rounded-full p-1.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-neutral-300"
                aria-label="ปิด"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>เมนู</TableHead>
                    <TableHead className="text-right">จาน</TableHead>
                    <TableHead className="text-right">ยอดขาย</TableHead>
                    <TableHead className="text-right">สัดส่วน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDishes.map((dish, idx) => (
                    <TableRow key={dish.name}>
                      <TableCell className="font-bold tabular-nums text-slate-400 dark:text-neutral-500">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-neutral-100">
                        {dish.name}
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-red-600 dark:text-red-400">
                        {dish.totalQty}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatBaht(dish.totalRevenue)} ฿
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-500 dark:text-neutral-400">
                        {totalQty > 0 ? `${((dish.totalQty / totalQty) * 100).toFixed(1)}%` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
