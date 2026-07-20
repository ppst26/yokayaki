"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp, Trash2, Award,
  DollarSign, Clock, ClipboardList, Package, X, CalendarDays, BarChart3
} from 'lucide-react';

// ========== Interfaces ==========

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

interface PaymentSummary {
  cashTotal: number;
  promptpayTotal: number;
  netTotal: number;
  orderCount: number;
}

interface ItemSalesCount {
  name: string;
  quantity: number;
  revenue: number;
}

interface ChartBar {
  label: string;
  amount: number;
}



type PresetKey = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | '3_months' | '6_months' | 'custom';

interface PresetOption {
  key: PresetKey;
  label: string;
}

const PRESETS: PresetOption[] = [
  { key: 'today', label: 'วันนี้' },
  { key: 'yesterday', label: 'เมื่อวาน' },
  { key: 'this_week', label: 'สัปดาห์นี้' },
  { key: 'this_month', label: 'เดือนนี้' },
  { key: 'last_month', label: 'เดือนที่แล้ว' },
  { key: '3_months', label: '3 เดือน' },
  { key: '6_months', label: '6 เดือน' },
];

// ========== Date Helpers ==========

function getPresetRange(key: PresetKey): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  switch (key) {
    case 'today':
      return { start: todayStart, end: now };
    case 'yesterday': {
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(todayStart);
      yEnd.setMilliseconds(-1); // 23:59:59.999 yesterday
      return { start: yStart, end: yEnd };
    }
    case 'this_week': {
      const wStart = new Date(todayStart);
      const day = wStart.getDay(); // 0=Sun
      const diff = day === 0 ? 6 : day - 1; // shift to Monday
      wStart.setDate(wStart.getDate() - diff);
      return { start: wStart, end: now };
    }
    case 'this_month': {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: mStart, end: now };
    }
    case 'last_month': {
      const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: lmStart, end: lmEnd };
    }
    case '3_months': {
      const m3Start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      m3Start.setHours(0, 0, 0, 0);
      return { start: m3Start, end: now };
    }
    case '6_months': {
      const m6Start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      m6Start.setHours(0, 0, 0, 0);
      return { start: m6Start, end: now };
    }
    default:
      return { start: todayStart, end: now };
  }
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMinDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return toDateInputValue(d);
}

function getDaySpan(start: Date, end: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

// ========== Chart Grouping Helper ==========

function groupSalesForChart(
  salesData: { created_at: string; revenue: number }[],
  startDate: Date,
  endDate: Date
): ChartBar[] {
  const daySpan = getDaySpan(startDate, endDate);

  if (daySpan <= 1) {
    // Hourly (16:00 - 23:00)
    const hoursMap: Record<number, number> = {};
    for (let h = 16; h <= 23; h++) hoursMap[h] = 0;
    salesData.forEach(item => {
      const hour = new Date(item.created_at).getHours();
      if (hour >= 16 && hour <= 23) {
        hoursMap[hour] = (hoursMap[hour] || 0) + item.revenue;
      }
    });
    return Object.entries(hoursMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([h, amount]) => ({ label: `${h}:00`, amount }));
  }

  if (daySpan <= 7) {
    // Daily — one bar per day, label = day name
    const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const dayMap: Record<string, { label: string; amount: number; order: number }> = {};
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    let order = 0;
    while (cursor <= endDate) {
      const key = toDateInputValue(cursor);
      dayMap[key] = { label: dayNames[cursor.getDay()], amount: 0, order: order++ };
      cursor.setDate(cursor.getDate() + 1);
    }
    salesData.forEach(item => {
      const key = toDateInputValue(new Date(item.created_at));
      if (dayMap[key]) dayMap[key].amount += item.revenue;
    });
    return Object.values(dayMap).sort((a, b) => a.order - b.order).map(({ label, amount }) => ({ label, amount }));
  }

  if (daySpan <= 60) {
    // Daily — one bar per day, label = date number
    const dayMap: Record<string, { label: string; amount: number; order: number }> = {};
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    let order = 0;
    while (cursor <= endDate) {
      const key = toDateInputValue(cursor);
      dayMap[key] = { label: `${cursor.getDate()}`, amount: 0, order: order++ };
      cursor.setDate(cursor.getDate() + 1);
    }
    salesData.forEach(item => {
      const key = toDateInputValue(new Date(item.created_at));
      if (dayMap[key]) dayMap[key].amount += item.revenue;
    });
    return Object.values(dayMap).sort((a, b) => a.order - b.order).map(({ label, amount }) => ({ label, amount }));
  }

  if (daySpan <= 120) {
    // Weekly
    const weekMap: Record<string, { amount: number; order: number }> = {};
    let weekIndex = 0;
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= endDate) {
      const weekKey = `สป.${weekIndex + 1}`;
      if (!weekMap[weekKey]) weekMap[weekKey] = { amount: 0, order: weekIndex };
      cursor.setDate(cursor.getDate() + 1);
      if (cursor.getDay() === 1) weekIndex++; // new week on Monday
    }
    // Assign data to weeks
    salesData.forEach(item => {
      const itemDate = new Date(item.created_at);
      const diffDays = Math.floor((itemDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const wi = Math.floor(diffDays / 7);
      const weekKey = `สป.${wi + 1}`;
      if (weekMap[weekKey]) weekMap[weekKey].amount += item.revenue;
    });
    return Object.entries(weekMap)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([label, { amount }]) => ({ label, amount }));
  }

  // Monthly (> 120 days)
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const monthMap: Record<string, { label: string; amount: number; order: number }> = {};
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  let order = 0;
  while (cursor <= endDate) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    monthMap[key] = { label: monthNames[cursor.getMonth()], amount: 0, order: order++ };
    cursor.setMonth(cursor.getMonth() + 1);
  }
  salesData.forEach(item => {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthMap[key]) monthMap[key].amount += item.revenue;
  });
  return Object.values(monthMap).sort((a, b) => a.order - b.order).map(({ label, amount }) => ({ label, amount }));
}

function getChartTitle(daySpan: number): string {
  if (daySpan <= 1) return 'กราฟยอดขาย (รายชั่วโมง)';
  if (daySpan <= 7) return 'กราฟยอดขาย (รายวัน)';
  if (daySpan <= 60) return 'กราฟยอดขาย (รายวัน)';
  if (daySpan <= 120) return 'กราฟยอดขาย (รายสัปดาห์)';
  return 'กราฟยอดขาย (รายเดือน)';
}

// ========== Component ==========

export const OwnerDashboard: React.FC = () => {
  // Date range state
  const [activePreset, setActivePreset] = useState<PresetKey>('today');
  const [startDate, setStartDate] = useState<Date>(() => getPresetRange('today').start);
  const [endDate, setEndDate] = useState<Date>(() => getPresetRange('today').end);

  // Data state
  const [payments, setPayments] = useState<PaymentSummary>({ cashTotal: 0, promptpayTotal: 0, netTotal: 0, orderCount: 0 });
  const [voidLogs, setVoidLogs] = useState<VoidLog[]>([]);
  const [topSellers, setTopSellers] = useState<ItemSalesCount[]>([]);
  const [chartBars, setChartBars] = useState<ChartBar[]>([]);

  const [ingredientCost, setIngredientCost] = useState(0);
  const [loading, setLoading] = useState(true);

  // Void modal state
  const [showVoidModal, setShowVoidModal] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      const startDateStr = toDateInputValue(startDate);
      const endDateStr = toDateInputValue(endDate);

      // 1. ดึงยอดจ่ายตามช่วงเวลา
      const { data: payData, error: payError } = await supabase
        .from('payments')
        .select('payment_method, net_amount')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (payError) throw payError;

      let cashTotal = 0;
      let promptpayTotal = 0;
      let netTotal = 0;

      payData?.forEach((p: { payment_method: string; net_amount: number | string }) => {
        const amt = parseFloat(p.net_amount as string);
        netTotal += amt;
        if (p.payment_method === 'cash') {
          cashTotal += amt;
        } else if (p.payment_method === 'promptpay') {
          promptpayTotal += amt;
        } else if (p.payment_method === 'mixed') {
          cashTotal += amt * 0.5;
          promptpayTotal += amt * 0.5;
        }
      });

      setPayments({
        cashTotal,
        promptpayTotal,
        netTotal,
        orderCount: payData?.length || 0
      });

      // 2. ดึงประวัติ Void Logs ตามช่วงเวลา
      const { data: voidData, error: voidError } = await supabase
        .from('void_logs')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false });

      if (voidError) throw voidError;
      setVoidLogs((voidData || []) as VoidLog[]);

      // 3. ดึงยอดสั่งอาหารที่เสิร์ฟสำเร็จตามช่วงเวลา
      const { data: salesData, error: salesError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          discount_applied,
          status,
          created_at,
          menu_items (
            name
          )
        `)
        .eq('status', 'served')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (salesError) throw salesError;

      const itemMap: { [key: string]: { quantity: number; revenue: number } } = {};
      const rawSalesForChart: { created_at: string; revenue: number }[] = [];

      salesData?.forEach((item: { quantity: number; unit_price: number; discount_applied: number; created_at: string; menu_items: { name: string }[] | { name: string } | null }) => {
        const mi = item.menu_items;
        const name = Array.isArray(mi) ? mi[0]?.name : mi?.name || 'ไม่ทราบชื่อ';
        const qty = item.quantity;
        const rev = (item.unit_price * qty) - item.discount_applied;

        if (itemMap[name]) {
          itemMap[name].quantity += qty;
          itemMap[name].revenue += rev;
        } else {
          itemMap[name] = { quantity: qty, revenue: rev };
        }

        rawSalesForChart.push({ created_at: item.created_at, revenue: rev });
      });

      const topList = Object.keys(itemMap).map(name => ({
        name,
        quantity: itemMap[name].quantity,
        revenue: itemMap[name].revenue
      })).sort((a, b) => b.quantity - a.quantity);

      setTopSellers(topList);

      // Adaptive chart bars
      const bars = groupSalesForChart(rawSalesForChart, startDate, endDate);
      setChartBars(bars);

      // 4. ดึงข้อมูลประวัติจัดซื้อวัตถุดิบตามช่วงเวลา
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('item_ingredients')
        .select('*')
        .gte('purchase_date', startDateStr)
        .lte('purchase_date', endDateStr)
        .order('created_at', { ascending: false });

      if (purchaseError) throw purchaseError;

      const totalPurchasedCost = (purchaseData || []).reduce((sum: number, item: { cost: number | string }) => sum + parseFloat(item.cost as string), 0);
      setIngredientCost(totalPurchasedCost);


    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ========== Preset Handler ==========

  const handlePreset = (key: PresetKey) => {
    const { start, end } = getPresetRange(key);
    setActivePreset(key);
    setStartDate(start);
    setEndDate(end);
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    setActivePreset('custom');
    if (type === 'start') {
      const d = new Date(value);
      d.setHours(0, 0, 0, 0);
      setStartDate(d);
    } else {
      const d = new Date(value);
      d.setHours(23, 59, 59, 999);
      setEndDate(d);
    }
  };

  // ========== Computed Values ==========

  const totalWaste = voidLogs
    .filter(log => !log.restored_stock)
    .reduce((sum, log) => sum + parseFloat(log.total_amount as unknown as string), 0);

  const voidCount = voidLogs.length;

  // Top 3 voided items
  const voidMenuMap: Record<string, number> = {};
  voidLogs.forEach(log => {
    voidMenuMap[log.menu_name] = (voidMenuMap[log.menu_name] || 0) + log.quantity;
  });
  const topVoidItems = Object.entries(voidMenuMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const maxBarAmount = Math.max(...chartBars.map(h => h.amount), 500);
  const daySpan = getDaySpan(startDate, endDate);
  const chartTitle = getChartTitle(daySpan);

  // ========== Render ==========

  return (
    <div className="bg-stone-950 text-white min-h-[calc(100vh-80px)] p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ส่วนหัวรายงาน */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-850 pb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              รายงานวิเคราะห์ยอดขายและระบบตรวจสอบ (Owner Dashboard)
            </h2>
            <p className="text-stone-400 text-xs mt-1">วิเคราะห์ข้อมูลยอดขาย รายละเอียดธุรกรรม และประวัติสูญเสียวัตถุดิบ</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs font-bold text-stone-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            รีเฟรชข้อมูลแดชบอร์ด
          </button>
        </div>

        {/* ========== Date Range Filter ========== */}
        <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-stone-200">ช่วงเวลารายงาน</span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                  activePreset === p.key
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200 hover:border-stone-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-stone-500 font-medium">จาก</span>
            <input
              type="date"
              value={toDateInputValue(startDate)}
              min={getMinDate()}
              max={toDateInputValue(endDate)}
              onChange={e => handleCustomDateChange('start', e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 text-xs font-medium focus:border-amber-500/50 focus:outline-none cursor-pointer [color-scheme:dark]"
            />
            <span className="text-stone-500 font-medium">ถึง</span>
            <input
              type="date"
              value={toDateInputValue(endDate)}
              min={toDateInputValue(startDate)}
              max={toDateInputValue(new Date())}
              onChange={e => handleCustomDateChange('end', e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 text-xs font-medium focus:border-amber-500/50 focus:outline-none cursor-pointer [color-scheme:dark]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ========== กล่องสรุปสถิติตัวเลข ========== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-stone-400 text-xs font-medium">ยอดขายสุทธิ</div>
                  <div className="text-2xl font-black text-white">{payments.netTotal.toLocaleString()} ฿</div>
                </div>
                <div className="p-3 bg-emerald-950/30 text-emerald-400 rounded-xl border border-emerald-900/25">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-stone-400 text-xs font-medium">ต้นทุนวัตถุดิบ</div>
                  <div className="text-2xl font-black text-amber-500">{ingredientCost.toLocaleString()} ฿</div>
                </div>
                <div className="p-3 bg-amber-950/30 text-amber-400 rounded-xl border border-amber-900/25">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-stone-400 text-xs font-medium">กำไรสุทธิ (Net Profit)</div>
                  <div className={`text-2xl font-black ${(payments.netTotal - ingredientCost - totalWaste) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(payments.netTotal - ingredientCost - totalWaste).toLocaleString()} ฿
                  </div>
                </div>
                <div className="p-3 bg-stone-850 text-stone-300 rounded-xl border border-stone-800">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-stone-400 text-xs font-medium">จำนวนออเดอร์ปิดบิล</div>
                  <div className="text-2xl font-black text-white">{payments.orderCount} บิล</div>
                </div>
                <div className="p-3 bg-blue-950/30 text-blue-400 rounded-xl border border-blue-900/25">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* ========== กราฟ Adaptive + เมนูขายดี ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* กราฟแท่ง Adaptive */}
              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-6 backdrop-blur-md lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-stone-200">{chartTitle}</h3>
                </div>

                {chartBars.length > 0 ? (
                  <div className="h-64 flex items-end justify-between gap-1 pt-6 px-1 border-b border-stone-800 relative overflow-x-auto">
                    {chartBars.map((data, idx) => {
                      const pct = (data.amount / maxBarAmount) * 100;
                      return (
                        <div key={`${data.label}-${idx}`} className="flex-1 flex flex-col items-center group relative h-full justify-end min-w-[18px]">
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full mb-2 bg-stone-950 border border-stone-800 text-stone-200 text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl">
                            {data.amount.toLocaleString()} ฿
                          </div>
                          <div
                            style={{ height: `${Math.max(4, pct)}%` }}
                            className="w-full bg-gradient-to-t from-amber-600 to-amber-400 group-hover:from-amber-500 group-hover:to-yellow-400 rounded-t transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                          />
                          <span className={`font-semibold mt-2 text-stone-500 ${chartBars.length > 15 ? 'text-[7px]' : 'text-[10px]'}`}>
                            {data.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-stone-500 text-xs font-semibold">
                    ไม่มีข้อมูลยอดขายในช่วงเวลานี้
                  </div>
                )}
              </div>

              {/* การจัดอันดับสินค้าขายดี */}
              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-6 backdrop-blur-md space-y-6">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-bold text-stone-200">จัดอันดับเมนูขายดี</h3>
                </div>

                <div className="space-y-4">
                  {topSellers.slice(0, 5).map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between border-b border-stone-850 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                          idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' :
                          idx === 1 ? 'bg-stone-200/20 text-stone-200 border border-stone-300/20' :
                          'bg-stone-800 text-stone-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-stone-300">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-white">{item.quantity} จาน</div>
                        <div className="text-[10px] text-stone-500 font-semibold">{item.revenue.toLocaleString()} ฿</div>
                      </div>
                    </div>
                  ))}
                  {topSellers.length === 0 && (
                    <div className="text-center py-10 text-stone-500 text-xs font-semibold">
                      ยังไม่มีรายการจำหน่ายในช่วงเวลานี้
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========== Void Logs Summary Card ========== */}
            <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-6 backdrop-blur-md space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-bold text-stone-200">สรุปการยกเลิกรายการอาหาร (Void Summary)</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-red-400 bg-red-950/20 border border-red-900/40 px-3 py-1 rounded-xl">
                    สูญเสีย {totalWaste.toLocaleString()} ฿
                  </span>
                  <span className="text-xs font-bold text-stone-400 bg-stone-900 border border-stone-800 px-3 py-1 rounded-xl">
                    {voidCount} ครั้ง
                  </span>
                </div>
              </div>

              {voidCount > 0 ? (
                <>
                  {/* Top 3 voided items */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {topVoidItems.map(([menuName, qty], idx) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      return (
                        <div key={menuName} className="flex items-center gap-3 bg-stone-950/50 border border-stone-850 rounded-xl px-4 py-3">
                          <span className="text-lg">{medals[idx]}</span>
                          <div>
                            <div className="text-xs font-bold text-stone-200">{menuName}</div>
                            <div className="text-[10px] text-stone-500 font-semibold">{qty} ครั้ง</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* View all button */}
                  <button
                    onClick={() => setShowVoidModal(true)}
                    className="w-full py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs font-bold text-stone-400 hover:text-white hover:border-stone-700 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    ดูรายละเอียดทั้งหมด ({voidCount} รายการ)
                  </button>
                </>
              ) : (
                <div className="text-center py-6 text-stone-500 text-xs font-semibold">
                  ไม่มีการยกเลิกรายการอาหารในช่วงเวลานี้
                </div>
              )}
            </div>

            {/* ========== Void Logs Modal ========== */}
            {showVoidModal && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowVoidModal(false)}>
                <div className="bg-stone-950 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <h3 className="text-sm font-bold text-stone-200">ประวัติการยกเลิกรายการอาหาร (Void Audit Log)</h3>
                    </div>
                    <button
                      onClick={() => setShowVoidModal(false)}
                      className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="overflow-auto max-h-[calc(85vh-60px)] p-6">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-stone-400 text-xs font-bold border-b border-stone-800 pb-3">
                          <th className="py-2.5">เวลา</th>
                          <th className="py-2.5">รายการอาหาร</th>
                          <th className="py-2.5 text-center">จำนวน</th>
                          <th className="py-2.5 text-right">มูลค่า</th>
                          <th className="py-2.5">สาเหตุการยกเลิก</th>
                          <th className="py-2.5 text-center">คืนสต็อก</th>
                          <th className="py-2.5">พนักงาน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-850 text-xs text-stone-300">
                        {voidLogs.map(log => (
                          <tr key={log.id} className="hover:bg-stone-900/10 transition-colors">
                            <td className="py-3 font-semibold text-stone-500">
                              {new Date(log.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}{' '}
                              {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 font-bold text-stone-200">{log.menu_name}</td>
                            <td className="py-3 text-center font-bold">{log.quantity}</td>
                            <td className="py-3 text-right font-black text-stone-100">{log.total_amount} ฿</td>
                            <td className="py-3 text-stone-400">{log.reason}</td>
                            <td className="py-3 text-center">
                              {log.restored_stock ? (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-2 py-0.5 rounded-full">
                                  คืนสต็อก
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-red-400 bg-red-950/30 border border-red-900/30 px-2 py-0.5 rounded-full">
                                  วัตถุดิบเสียเปล่า
                                </span>
                              )}
                            </td>
                            <td className="py-3 font-medium text-stone-400">{log.employee_name}</td>
                          </tr>
                        ))}
                        {voidLogs.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-stone-500 font-medium text-xs">
                              ไม่มีบันทึกประวัติการยกเลิกรายการอาหาร
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}


          </>
        )}
      </div>
    </div>
  );
};
