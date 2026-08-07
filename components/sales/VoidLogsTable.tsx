"use client";

import React from 'react';
import { Trash2 } from 'lucide-react';

interface VoidLog {
  id: number;
  employee_name: string;
  menu_name: string;
  quantity: number;
  total_amount: number;
  reason: string;
  restored_stock: boolean;
  created_at: string;
}

interface VoidLogsTableProps {
  voidLogs: VoidLog[];
  voidLoading: boolean;
  formatTime: (dateStr: string) => string;
}

export const VoidLogsTable: React.FC<VoidLogsTableProps> = ({
  voidLogs,
  voidLoading,
  formatTime,
}) => {
  if (voidLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (voidLogs.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-8">
        <Trash2 className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">
          ไม่มีประวัติการ Void รายการในวันนี้
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-neutral-800/80 border-b border-slate-200 dark:border-neutral-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
              <th className="p-4">เวลา</th>
              <th className="p-4">รายการอาหาร</th>
              <th className="p-4 text-center">จำนวน</th>
              <th className="p-4 text-right">มูลค่า Void</th>
              <th className="p-4">เหตุผลในการ Void</th>
              <th className="p-4">ผู้ทำรายการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs font-semibold text-slate-800 dark:text-neutral-200">
            {voidLogs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/50 transition">
                <td className="p-4 text-slate-500 dark:text-neutral-400">{formatTime(log.created_at)} น.</td>
                <td className="p-4 font-bold text-slate-900 dark:text-neutral-100">{log.menu_name}</td>
                <td className="p-4 text-center font-bold">{log.quantity}</td>
                <td className="p-4 text-right font-extrabold text-rose-600 dark:text-rose-400">
                  {Number(log.total_amount).toLocaleString()} ฿
                </td>
                <td className="p-4">
                  <span className="bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2 py-1 rounded-md text-[11px]">
                    {log.reason}
                  </span>
                </td>
                <td className="p-4 text-slate-600 dark:text-neutral-300">{log.employee_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
