"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  UtensilsCrossed,
  Award,
  RefreshCw,
} from 'lucide-react';

interface AnalyticsData {
  totalRevenue: number;
  totalBills: number;
  avgBillValue: number;
  totalMembers: number;
  topMenuItems: { name: string; total_qty: number; total_revenue: number }[];
}

export const OwnerDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalBills: 0,
    avgBillValue: 0,
    totalMembers: 0,
    topMenuItems: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Payments Today
      const { data: payments } = await supabase
        .from('payments')
        .select('net_amount')
        .gte('created_at', todayStart.toISOString());

      const totalRev = (payments || []).reduce((s, p) => s + parseFloat(p.net_amount as any), 0);
      const totalB = (payments || []).length;
      const avgB = totalB > 0 ? Math.round(totalRev / totalB) : 0;

      // Total Members
      const { count: memberCount } = await supabase
        .from('loyalty_members')
        .select('*', { count: 'exact', head: true });

      // Top Menu Items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('quantity, unit_price, menu_items(name)')
        .neq('status', 'voided');

      const menuMap: Record<string, { qty: number; rev: number }> = {};
      (orderItems || []).forEach((item: any) => {
        const name = item.menu_items?.name || 'อื่นๆ';
        if (!menuMap[name]) menuMap[name] = { qty: 0, rev: 0 };
        menuMap[name].qty += item.quantity;
        menuMap[name].rev += item.quantity * item.unit_price;
      });

      const topMenu = Object.entries(menuMap)
        .map(([name, val]) => ({ name, total_qty: val.qty, total_revenue: val.rev }))
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, 5);

      setData({
        totalRevenue: totalRev,
        totalBills: totalB,
        avgBillValue: avgB,
        totalMembers: memberCount || 0,
        topMenuItems: topMenu,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
            แผงควบคุมเจ้าของร้าน (Owner Analytics)
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold mt-0.5">
            ภาพรวมผลประกอบการประจำวัน รายงานยอดขาย และ 5 เมนูขายดีที่สุด
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  ยอดขายวันนี้
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-neutral-100">
                {data.totalRevenue.toLocaleString()}{' '}
                <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">฿</span>
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  จำนวนบิลปิดแล้ว
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-neutral-100">
                {data.totalBills}{' '}
                <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">บิล</span>
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  ยอดขายเฉลี่ย/บิล
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-neutral-100">
                {data.avgBillValue.toLocaleString()}{' '}
                <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">฿</span>
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                  จำนวนสมาชิกทั้งหมด
                </span>
                <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-neutral-100">
                {data.totalMembers}{' '}
                <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">คน</span>
              </p>
            </div>
          </div>

          {/* Top 5 Menu Items */}
          <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-amber-500" />
              5 อันดับเมนูขายดีที่สุด
            </h3>

            {data.topMenuItems.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-neutral-500 py-6 text-center">
                ยังไม่มีข้อมูลการขาย
              </p>
            ) : (
              <div className="space-y-3">
                {data.topMenuItems.map((item, index) => (
                  <div
                    key={item.name}
                    className="p-4 bg-slate-50 dark:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700/80 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-neutral-100">
                        {item.name}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-red-600 dark:text-red-400 block">
                        {item.total_qty} จาน
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-semibold">
                        ยอดขาย {item.total_revenue.toLocaleString()} ฿
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
