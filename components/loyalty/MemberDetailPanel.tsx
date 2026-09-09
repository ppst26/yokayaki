"use client";

import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Banknote,
  ChevronRight,
  Copy,
  CreditCard,
  Pencil,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MemberTagChips } from './MemberTagChips';
import { RFM_SEGMENT_META } from '@/lib/memberRfm';
import type { MemberTagCode } from '@/lib/memberTags';
import type { MemberRfm } from '@/lib/memberRfm';
import type {
  BillRecord,
  FavoriteMenu,
  LoyaltyMember,
  MemberStats,
  PointEvent,
} from './memberProfileTypes';

interface MemberDetailPanelProps {
  selectedMember: LoyaltyMember;
  stats: MemberStats;
  tags: MemberTagCode[];
  rfm: MemberRfm | null;
  favoriteMenus: FavoriteMenu[];
  bills: BillRecord[];
  pointEvents: PointEvent[];
  loading?: boolean;
  formatDate: (dateStr: string) => string;
  formatTime: (dateStr: string) => string;
  getPaymentLabel: (method: string) => string;
  onEdit: () => void;
  onAdjustPoints: () => void;
  onDelete: () => void;
}

function SidebarInfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/50 dark:border-neutral-800/60 last:border-0">
      <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 shrink-0">
        {label}
      </span>
      <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 text-right">
        {value}
      </span>
    </div>
  );
}

function RfmBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 5) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400">
        <span>{label}</span>
        <span>{score}/5</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200/80 dark:bg-neutral-700/80 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8b1010] to-[#d11f24]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PaymentIcon({ method }: { method: string }) {
  if (method === 'cash') return <Banknote className="h-3.5 w-3.5 shrink-0" />;
  if (method === 'mixed') return <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />;
  return <CreditCard className="h-3.5 w-3.5 shrink-0" />;
}

export const MemberDetailPanel: React.FC<MemberDetailPanelProps> = ({
  selectedMember,
  stats,
  tags,
  rfm,
  favoriteMenus,
  bills,
  pointEvents,
  loading = false,
  formatDate,
  formatTime,
  getPaymentLabel,
  onEdit,
  onAdjustPoints,
  onDelete,
}) => {
  const [historyTab, setHistoryTab] = useState<'bills' | 'points'>('bills');
  const rfmMeta = rfm ? RFM_SEGMENT_META[rfm.segment] : null;

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(selectedMember.phone_number);
    } catch {
      /* ignore */
    }
  };

  const lastVisitLabel = stats.last_visit_at
    ? formatDate(stats.last_visit_at)
    : '—';

  const lastVisitSub =
    rfm && rfm.days_inactive > 0
      ? `${rfm.days_inactive} วันที่แล้ว`
      : stats.last_visit_at
        ? 'ล่าสุด'
        : '';

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-start">
        {/* Sidebar — ข้อมูลลูกค้า */}
        <aside className="md:w-[45%] lg:w-[40%] xl:w-[35%] shrink-0 border-b md:border-b-0 md:border-r border-slate-200/60 dark:border-neutral-800/80 p-6 md:p-6 lg:p-7 flex flex-col">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-5">
            ข้อมูลลูกค้า
          </p>

          <div className="flex gap-4 items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 ring-2 ring-slate-200/60 dark:ring-neutral-700/80">
              <User className="h-12 w-12" />
            </div>

            <div className="flex-1 min-w-0 flex flex-col items-start text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900 dark:text-neutral-100 leading-tight">
                  {selectedMember.name}
                </h2>
                {tags.length > 0 && <MemberTagChips tags={tags} size="sm" />}
              </div>
              <button
                type="button"
                onClick={copyPhone}
                className="mt-2 inline-flex items-center gap-1.5 text-base font-semibold text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 transition cursor-pointer"
              >
                <span className="font-mono tracking-wide">{selectedMember.phone_number}</span>
                <Copy className="h-4 w-4 opacity-60" />
              </button>
              <p className="mt-1.5 text-sm text-slate-400 dark:text-neutral-500">
                สมาชิกเมื่อ {formatDate(selectedMember.created_at)}
              </p>
              {rfmMeta && (
                <div className="mt-2.5">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-md border ${rfmMeta.className}`}
                  >
                    {rfmMeta.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
              แต้มคงเหลือ
            </p>
            <p className="mt-1 text-4xl font-black text-amber-500 dark:text-amber-400 leading-none">
              {selectedMember.points.toLocaleString()}
              <span className="ml-2 text-lg font-bold text-amber-600/80 dark:text-amber-500/80">
                แต้ม
              </span>
            </p>
          </div>

          {!loading && (
            <div className="mt-5 rounded-xl border border-slate-200/60 dark:border-neutral-800/80 px-4 py-1">
              <SidebarInfoRow
                label="ยอดใช้จ่ายรวม"
                value={`${stats.lifetime_spend.toLocaleString()} ฿`}
              />
              <SidebarInfoRow
                label="มาใช้บริการ"
                value={`${stats.visit_count.toLocaleString()} ครั้ง`}
              />
              <SidebarInfoRow
                label="เฉลี่ยต่อบิล"
                value={`${stats.avg_per_bill.toLocaleString()} ฿`}
              />
              <SidebarInfoRow
                label="มาครั้งล่าสุด"
                value={
                  stats.last_visit_at ? (
                    <span>
                      {lastVisitLabel}
                      {lastVisitSub ? (
                        <span className="block text-[10px] font-semibold text-slate-400 dark:text-neutral-500 mt-0.5">
                          {lastVisitSub}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
            </div>
          )}

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={onAdjustPoints}
              className="btn-crimson flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-extrabold cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              ปรับแต้ม
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 transition cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              แก้ไขข้อมูล
            </button>
          </div>

          <div className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-2">
              เมนูโปรด
            </p>
            {loading ? (
              <div className="h-16 rounded-xl bg-slate-100/80 dark:bg-neutral-800/50 animate-pulse" />
            ) : favoriteMenus.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-neutral-500">ยังไม่มีข้อมูล</p>
            ) : (
              <ul className="space-y-2">
                {favoriteMenus.map(menu => (
                  <li
                    key={menu.menu_item_id}
                    className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-neutral-300"
                  >
                    <span className="truncate pr-2">{menu.name}</span>
                    <span className="shrink-0 text-slate-400 dark:text-neutral-500">
                      ×{menu.total_quantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={onDelete}
            className="mt-6 flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            ลบสมาชิก
          </button>
        </aside>

        {/* Main — ภาพรวม + RFM + ประวัติ */}
        <div className="md:w-[55%] lg:w-[60%] xl:w-[65%] flex-1 min-w-0">
          {/* ภาพรวม */}
          <section className="border-b border-slate-200/60 dark:border-neutral-800/80 px-6 py-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-4">
              ภาพรวม
            </p>
            {loading ? (
              <div className="h-14 rounded-xl bg-slate-100/80 dark:bg-neutral-800/50 animate-pulse" />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/60 dark:divide-neutral-800/80">
                <div className="pb-4 lg:pb-0 lg:pr-5">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500">ยอดใช้จ่ายรวม</p>
                  <p className="mt-1 text-xl font-black text-slate-900 dark:text-neutral-100">
                    {stats.lifetime_spend.toLocaleString()} <span className="text-sm font-bold">฿</span>
                  </p>
                </div>
                <div className="pt-4 pb-4 lg:py-0 lg:px-5">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500">ความถี่การมาใช้บริการ</p>
                  <p className="mt-1 text-xl font-black text-slate-900 dark:text-neutral-100">
                    {stats.visit_count.toLocaleString()} <span className="text-sm font-bold">ครั้ง</span>
                  </p>
                </div>
                <div className="pt-4 pb-4 lg:py-0 lg:px-5">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500">เฉลี่ยต่อบิล</p>
                  <p className="mt-1 text-xl font-black text-slate-900 dark:text-neutral-100">
                    {stats.avg_per_bill.toLocaleString()} <span className="text-sm font-bold">฿</span>
                  </p>
                </div>
                <div className="pt-4 lg:py-0 lg:pl-5">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500">มาครั้งล่าสุด</p>
                  <p className="mt-1 text-xl font-black text-slate-900 dark:text-neutral-100 leading-tight">
                    {lastVisitLabel}
                  </p>
                  {lastVisitSub && (
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 mt-0.5">
                      {lastVisitSub}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* RFM */}
          {rfm && rfmMeta && (
            <section className="border-b border-slate-200/60 dark:border-neutral-800/80 px-6 py-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  วิเคราะห์ RFM
                </p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${rfmMeta.className}`}
                >
                  {rfmMeta.label}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 mb-4">
                {rfmMeta.description}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <RfmBar label="R ล่าสุด" score={rfm.r} />
                <RfmBar label="F ความถี่" score={rfm.f} />
                <RfmBar label="M ยอดเงิน" score={rfm.m} />
              </div>
            </section>
          )}

          {/* ประวัติ — tabs + table */}
          <section className="px-6 py-4">
            <div className="flex gap-6 border-b border-slate-200/60 dark:border-neutral-800/80 mb-4">
              <button
                type="button"
                onClick={() => setHistoryTab('bills')}
                className={`pb-2.5 text-xs font-extrabold transition cursor-pointer border-b-2 -mb-px ${
                  historyTab === 'bills'
                    ? 'border-[#d11f24] text-slate-900 dark:text-neutral-100'
                    : 'border-transparent text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300'
                }`}
              >
                ประวัติการใช้บริการ ({bills.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('points')}
                className={`pb-2.5 text-xs font-extrabold transition cursor-pointer border-b-2 -mb-px ${
                  historyTab === 'points'
                    ? 'border-[#d11f24] text-slate-900 dark:text-neutral-100'
                    : 'border-transparent text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300'
                }`}
              >
                ประวัติแต้ม ({pointEvents.length})
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : historyTab === 'bills' ? (
              bills.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-neutral-500 text-center py-6">
                  ยังไม่มีประวัติการชำระเงิน
                </p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-slate-200/60 dark:border-neutral-800/80">
                        <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-neutral-500">
                          บิล
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-neutral-500">
                          วันที่ / เวลา
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-neutral-500">
                          โต๊ะ
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-neutral-500">
                          ชำระ
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-neutral-500 text-right">
                          ยอดรวม
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-neutral-500 text-right">
                          แต้ม
                        </TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bills.map(b => (
                        <TableRow
                          key={b.id}
                          className="border-slate-200/40 dark:border-neutral-800/60 hover:bg-slate-50/50 dark:hover:bg-neutral-800/30"
                        >
                          <TableCell className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                            ORD-{b.order_id}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                            {formatDate(b.created_at)} {formatTime(b.created_at)} น.
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-neutral-300">
                            {b.table_number ? `โต๊ะ ${b.table_number}` : '—'}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-neutral-300">
                              <PaymentIcon method={b.payment_method} />
                              {getPaymentLabel(b.payment_method)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs font-black text-slate-900 dark:text-neutral-100">
                            {b.net_amount.toLocaleString()} ฿
                          </TableCell>
                          <TableCell className="text-right text-xs font-black">
                            {b.points_earned > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                +{b.points_earned}
                              </span>
                            ) : b.points_redeemed > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400">
                                -{b.points_redeemed}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-300 dark:text-neutral-600">
                            <ChevronRight className="h-4 w-4" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : pointEvents.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-neutral-500 text-center py-10">
                ยังไม่มีประวัติแต้ม
              </p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-200/60 dark:border-neutral-800/80">
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-neutral-500">
                        รายการ
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-neutral-500">
                        วันที่ / เวลา
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-neutral-500 text-right">
                        แต้ม
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pointEvents.map((event, idx) => {
                      const label =
                        event.kind === 'manual'
                          ? event.reason
                          : event.kind === 'earn'
                            ? `ได้แต้มจากบิล ORD-${event.order_id}`
                            : `ใช้แต้มบิล ORD-${event.order_id}`;
                      const delta =
                        event.kind === 'redeem'
                          ? -event.points
                          : event.kind === 'earn'
                            ? event.points
                            : event.points;

                      return (
                        <TableRow
                          key={`${event.kind}-${event.at}-${idx}`}
                          className="border-slate-200/40 dark:border-neutral-800/60"
                        >
                          <TableCell className="text-xs font-semibold text-slate-700 dark:text-neutral-300 max-w-[200px] truncate">
                            {label}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                            {formatDate(event.at)} {formatTime(event.at)} น.
                          </TableCell>
                          <TableCell className="text-right text-xs font-black">
                            <span
                              className={
                                delta > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {delta > 0 ? '+' : ''}
                              {delta}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      </div>
    </Card>
  );
};
