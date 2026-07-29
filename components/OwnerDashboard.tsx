"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp, Trash2, Award,
  DollarSign, Clock, ClipboardList, Package, X, CalendarDays, BarChart3,
  Users, CreditCard, Tag, PieChart, Wallet, ArrowUpRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

const chartConfig: ChartConfig = {
  amount: {
    label: "ยอดขาย",
    color: "#dc2626",
  },
};


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

interface CategorySalesCount {
  category: string;
  quantity: number;
  revenue: number;
  percentage: number;
}

interface MemberStats {
  memberRevenue: number;
  nonMemberRevenue: number;
  memberOrderCount: number;
  nonMemberOrderCount: number;
  avgMemberSpend: number;
  avgNonMemberSpend: number;
  pointsRedeemed: number;
}

interface DetailedPaymentSummary {
  cashTotal: number;
  cashCount: number;
  promptpayTotal: number;
  promptpayCount: number;
  mixedTotal: number;
  mixedCount: number;
  totalSubtotal: number;
  totalDiscount: number;
  netTotal: number;
  orderCount: number;
}

interface ChartBar {
  label: string;
  amount: number;
}

interface PromotionStat {
  promotion_name: string;
  promotion_type: string;
  usage_count: number;
  total_discount_value: number;
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

  // New states for enhanced analytics
  const [topSellerTab, setTopSellerTab] = useState<'sellers' | 'categories'>('sellers');
  const [categorySellers, setCategorySellers] = useState<CategorySalesCount[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStats>({
    memberRevenue: 0,
    nonMemberRevenue: 0,
    memberOrderCount: 0,
    nonMemberOrderCount: 0,
    avgMemberSpend: 0,
    avgNonMemberSpend: 0,
    pointsRedeemed: 0,
  });
  const [detailedPayments, setDetailedPayments] = useState<DetailedPaymentSummary>({
    cashTotal: 0,
    cashCount: 0,
    promptpayTotal: 0,
    promptpayCount: 0,
    mixedTotal: 0,
    mixedCount: 0,
    totalSubtotal: 0,
    totalDiscount: 0,
    netTotal: 0,
    orderCount: 0,
  });

  const [ingredientCost, setIngredientCost] = useState(0);
  const [loading, setLoading] = useState(true);

  // New states for Marketing & Promotions Analytics
  const [marketingTab, setMarketingTab] = useState<'promotions' | 'loyalty'>('promotions');
  const [promotionStats, setPromotionStats] = useState<PromotionStat[]>([]);
  const [totalPromoDiscount, setTotalPromoDiscount] = useState<number>(0);
  const [promoOrderCount, setPromoOrderCount] = useState<number>(0);

  // Void modal state
  const [showVoidModal, setShowVoidModal] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      const startDateStr = toDateInputValue(startDate);
      const endDateStr = toDateInputValue(endDate);

      // 1. ดึงยอดจ่ายตามช่วงเวลา (รวมฟิลด์ส่วนลด/แต้ม/สมาชิก)
      const { data: payData, error: payError } = await supabase
        .from('payments')
        .select('payment_method, subtotal, discount_amount, net_amount, points_redeemed, phone_number')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (payError) throw payError;

      let cashTotal = 0, cashCount = 0;
      let promptpayTotal = 0, promptpayCount = 0;
      let mixedTotal = 0, mixedCount = 0;
      let netTotal = 0, totalSubtotal = 0, totalDiscount = 0;

      let memberRevenue = 0, memberOrderCount = 0;
      let nonMemberRevenue = 0, nonMemberOrderCount = 0;
      let totalPointsRedeemed = 0;

      payData?.forEach((p: any) => {
        const net = parseFloat(p.net_amount as string) || 0;
        const sub = parseFloat(p.subtotal as string) || 0;
        const disc = parseFloat(p.discount_amount as string) || 0;
        const pts = parseInt(p.points_redeemed as string) || 0;

        netTotal += net;
        totalSubtotal += sub;
        totalDiscount += disc;
        totalPointsRedeemed += pts;

        if (p.payment_method === 'cash') {
          cashTotal += net;
          cashCount++;
        } else if (p.payment_method === 'promptpay') {
          promptpayTotal += net;
          promptpayCount++;
        } else if (p.payment_method === 'mixed') {
          mixedTotal += net;
          mixedCount++;
          cashTotal += net * 0.5;
          promptpayTotal += net * 0.5;
        }

        // Member vs Non-Member
        if (p.phone_number && p.phone_number.trim() !== '') {
          memberRevenue += net;
          memberOrderCount++;
        } else {
          nonMemberRevenue += net;
          nonMemberOrderCount++;
        }
      });

      setPayments({
        cashTotal,
        promptpayTotal,
        netTotal,
        orderCount: payData?.length || 0
      });

      setDetailedPayments({
        cashTotal, cashCount,
        promptpayTotal, promptpayCount,
        mixedTotal, mixedCount,
        totalSubtotal, totalDiscount,
        netTotal,
        orderCount: payData?.length || 0
      });

      setMemberStats({
        memberRevenue,
        nonMemberRevenue,
        memberOrderCount,
        nonMemberOrderCount,
        avgMemberSpend: memberOrderCount > 0 ? Math.round(memberRevenue / memberOrderCount) : 0,
        avgNonMemberSpend: nonMemberOrderCount > 0 ? Math.round(nonMemberRevenue / nonMemberOrderCount) : 0,
        pointsRedeemed: totalPointsRedeemed,
      });

      // 1.5. ดึงประวัติการใช้โปรโมชั่นตามช่วงเวลา
      const { data: promoData, error: promoError } = await supabase
        .from('payment_promotions')
        .select('promotion_name, promotion_type, discount_value')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (promoError) {
        console.error('Error fetching payment promotions:', promoError);
      } else {
        const promoMap: Record<string, { promotion_type: string; usage_count: number; total_discount_value: number }> = {};
        let totalDisc = 0;

        promoData?.forEach((p: any) => {
          const name = p.promotion_name || 'ไม่ระบุชื่อโปรโมชั่น';
          const disc = parseFloat(p.discount_value as string) || 0;
          const type = p.promotion_type || 'percentage';

          totalDisc += disc;

          if (promoMap[name]) {
            promoMap[name].usage_count += 1;
            promoMap[name].total_discount_value += disc;
          } else {
            promoMap[name] = {
              promotion_type: type,
              usage_count: 1,
              total_discount_value: disc,
            };
          }
        });

        const sortedPromos: PromotionStat[] = Object.entries(promoMap)
          .map(([name, data]) => ({
            promotion_name: name,
            promotion_type: data.promotion_type,
            usage_count: data.usage_count,
            total_discount_value: data.total_discount_value,
          }))
          .sort((a, b) => b.usage_count - a.usage_count || b.total_discount_value - a.total_discount_value);

        setPromotionStats(sortedPromos);
        setTotalPromoDiscount(totalDisc);
        setPromoOrderCount(promoData?.length || 0);
      }

      // 2. ดึงประวัติ Void Logs ตามช่วงเวลา
      const { data: voidData, error: voidError } = await supabase
        .from('void_logs')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false });

      if (voidError) throw voidError;
      setVoidLogs((voidData || []) as VoidLog[]);

      // 3. ดึงยอดสั่งอาหารที่เสิร์ฟสำเร็จตามช่วงเวลา (รวม category)
      const { data: salesData, error: salesError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          discount_applied,
          status,
          created_at,
          menu_items (
            name,
            category
          )
        `)
        .eq('status', 'served')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (salesError) throw salesError;

      const itemMap: { [key: string]: { quantity: number; revenue: number } } = {};
      const categoryMap: { [key: string]: { quantity: number; revenue: number } } = {};
      const rawSalesForChart: { created_at: string; revenue: number }[] = [];
      let totalSalesNet = 0;

      salesData?.forEach((item: any) => {
        const mi = item.menu_items;
        const name = Array.isArray(mi) ? mi[0]?.name : mi?.name || 'ไม่ทราบชื่อ';
        const category = Array.isArray(mi) ? mi[0]?.category : mi?.category || 'อื่นๆ';
        const qty = item.quantity;
        const rev = (item.unit_price * qty) - item.discount_applied;

        totalSalesNet += rev;

        // Item aggregation
        if (itemMap[name]) {
          itemMap[name].quantity += qty;
          itemMap[name].revenue += rev;
        } else {
          itemMap[name] = { quantity: qty, revenue: rev };
        }

        // Category aggregation
        if (categoryMap[category]) {
          categoryMap[category].quantity += qty;
          categoryMap[category].revenue += rev;
        } else {
          categoryMap[category] = { quantity: qty, revenue: rev };
        }

        rawSalesForChart.push({ created_at: item.created_at, revenue: rev });
      });

      const topList = Object.keys(itemMap).map(name => ({
        name,
        quantity: itemMap[name].quantity,
        revenue: itemMap[name].revenue
      })).sort((a, b) => b.quantity - a.quantity);

      setTopSellers(topList);

      const categoryList = Object.keys(categoryMap).map(cat => ({
        category: cat,
        quantity: categoryMap[cat].quantity,
        revenue: categoryMap[cat].revenue,
        percentage: totalSalesNet > 0 ? Math.round((categoryMap[cat].revenue / totalSalesNet) * 100) : 0
      })).sort((a, b) => b.revenue - a.revenue);

      setCategorySellers(categoryList);

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
    <div className="space-y-8 font-sans w-full">
      {/* ส่วนหัวรายงาน */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              รายงานวิเคราะห์ยอดขายและระบบตรวจสอบ (Owner Dashboard)
            </h2>
            <p className="text-slate-500 text-xs font-medium mt-0.5">วิเคราะห์ข้อมูลยอดขาย รายละเอียดธุรกรรม และประวัติสูญเสียวัตถุดิบ</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 hover:text-slate-900 transition active:scale-95 cursor-pointer shadow-xs"
          >
            รีเฟรชข้อมูลแดชบอร์ด
          </button>
        </div>

        {/* ========== Date Range Filter ========== */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-red-600" />
            <span className="text-sm font-extrabold text-slate-900">ช่วงเวลารายงาน</span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer border ${
                  activePreset === p.key
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="text-slate-500 font-medium">จาก</span>
            <input
              type="date"
              value={toDateInputValue(startDate)}
              min={getMinDate()}
              max={toDateInputValue(endDate)}
              onChange={e => handleCustomDateChange('start', e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:border-red-500 focus:outline-none cursor-pointer"
            />
            <span className="text-slate-500 font-medium">ถึง</span>
            <input
              type="date"
              value={toDateInputValue(endDate)}
              min={toDateInputValue(startDate)}
              max={toDateInputValue(new Date())}
              onChange={e => handleCustomDateChange('end', e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:border-red-500 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ========== กล่องสรุปสถิติตัวเลข ========== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-slate-500 text-xs font-semibold">ยอดขายสุทธิ</div>
                  <div className="text-2xl font-black text-slate-900">{payments.netTotal.toLocaleString()} ฿</div>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-slate-500 text-xs font-semibold">ต้นทุนวัตถุดิบ</div>
                  <div className="text-2xl font-black text-slate-800">{ingredientCost.toLocaleString()} ฿</div>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-slate-500 text-xs font-semibold">กำไรสุทธิ (Net Profit)</div>
                  <div className={`text-2xl font-black ${(payments.netTotal - ingredientCost - totalWaste) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {(payments.netTotal - ingredientCost - totalWaste).toLocaleString()} ฿
                  </div>
                </div>
                <div className="p-3 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-slate-500 text-xs font-semibold">จำนวนออเดอร์ปิดบิล</div>
                  <div className="text-2xl font-black text-slate-900">{payments.orderCount} บิล</div>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* ========== กราฟ Adaptive (Full Width) ========== */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6 w-full">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-red-600" />
                <h3 className="text-xs font-extrabold text-slate-800">{chartTitle}</h3>
              </div>

              {chartBars.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-72 w-full">
                  <BarChart data={chartBars} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(val) => `${val.toLocaleString()} ฿`}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    />
                    <ChartTooltip
                      cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                      content={<ChartTooltipContent formatter={(value) => `${Number(value).toLocaleString()} ฿`} />}
                    />
                    <Bar
                      dataKey="amount"
                      fill="var(--color-amount)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-medium">
                  ไม่มีข้อมูลยอดขายในช่วงเวลานี้
                </div>
              )}
            </div>

            {/* ========== Row 1: เมนูขายดี&หมวดหมู่ (Card 1) + สมาชิก vs ทั่วไป (Card 2) ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: การจัดอันดับสินค้าขายดี & สัดส่วนหมวดหมู่ */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
                <div>
                  {/* Card 1 Header + Badge Tabs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2">
                      {topSellerTab === 'sellers' ? (
                        <Award className="w-4 h-4 text-amber-500" />
                      ) : (
                        <PieChart className="w-4 h-4 text-purple-600" />
                      )}
                      <h3 className="text-xs font-extrabold text-slate-800">
                        {topSellerTab === 'sellers' ? 'จัดอันดับเมนูขายดี' : 'สัดส่วนยอดขายตามหมวดหมู่'}
                      </h3>
                    </div>

                    {/* Badge Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                      <button
                        onClick={() => setTopSellerTab('sellers')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          topSellerTab === 'sellers'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        🏆 รายการขายดี
                      </button>
                      <button
                        onClick={() => setTopSellerTab('categories')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          topSellerTab === 'categories'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        📊 หมวดหมู่
                      </button>
                    </div>
                  </div>

                  {/* Tab 1: Top Sellers */}
                  {topSellerTab === 'sellers' ? (
                    <div className="space-y-4">
                      {topSellers.slice(0, 5).map((item, idx) => (
                        <div key={item.name} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                              idx === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                              idx === 1 ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                              'bg-slate-50 text-slate-500 border border-slate-200'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-900">{item.quantity} จาน</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{item.revenue.toLocaleString()} ฿</div>
                          </div>
                        </div>
                      ))}
                      {topSellers.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-xs font-medium">
                          ยังไม่มีรายการจำหน่ายในช่วงเวลานี้
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Tab 2: Category Breakdown */
                    <div className="space-y-4">
                      {categorySellers.map((cat) => (
                        <div key={cat.category} className="space-y-1.5 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800">{cat.category}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-semibold text-[11px]">{cat.quantity} จาน</span>
                              <span className="font-black text-slate-900">{cat.revenue.toLocaleString()} ฿ ({cat.percentage}%)</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {categorySellers.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-xs font-medium">
                          ยังไม่มีข้อมูลหมวดหมู่ในช่วงเวลานี้
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: วิเคราะห์การตลาด & โปรโมชั่น (Hybrid Marketing & Loyalty Card) */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
                <div>
                  {/* Card Header & Badge Tabs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2">
                      {marketingTab === 'promotions' ? (
                        <Tag className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Users className="w-4 h-4 text-sky-600" />
                      )}
                      <h3 className="text-xs font-extrabold text-slate-800">
                        วิเคราะห์การตลาด & โปรโมชั่น (Marketing & Loyalty Insights)
                      </h3>
                    </div>

                    {/* Badge Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                      <button
                        onClick={() => setMarketingTab('promotions')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          marketingTab === 'promotions'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        🏷️ โปรโมชั่นยอดฮิต
                      </button>
                      <button
                        onClick={() => setMarketingTab('loyalty')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          marketingTab === 'loyalty'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        👑 พฤติกรรมสมาชิก & แต้ม
                      </button>
                    </div>
                  </div>

                  {/* Tab 1: Promotions Analytics */}
                  {marketingTab === 'promotions' ? (
                    <div className="space-y-4">
                      {promotionStats.slice(0, 5).map((promo, idx) => (
                        <div key={promo.promotion_name} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                              idx === 0 ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                              idx === 1 ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                              'bg-slate-50 text-slate-500 border border-slate-200'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800 truncate">{promo.promotion_name}</span>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border shrink-0 ${
                                  promo.promotion_type === 'percentage' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  promo.promotion_type === 'fixed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {promo.promotion_type === 'percentage' ? '% ส่วนลด' : promo.promotion_type === 'fixed' ? 'ลดคงที่' : 'แถมสินค้า'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-black text-slate-900">{promo.usage_count} บิล</div>
                            <div className="text-[10px] text-purple-600 font-bold">-{promo.total_discount_value.toLocaleString()} ฿</div>
                          </div>
                        </div>
                      ))}

                      {promotionStats.length > 0 ? (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                          <span className="font-semibold text-purple-900">ส่วนลดโปรโมชั่นรวม ({promoOrderCount} บิล):</span>
                          <span className="font-black text-purple-700">
                            -{totalPromoDiscount.toLocaleString()} ฿
                          </span>
                        </div>
                      ) : (
                        <div className="text-center py-10 text-slate-400 text-xs font-medium">
                          ยังไม่มีรายการใช้งานโปรโมชั่นในช่วงเวลานี้
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Tab 2: Loyalty & Points Analytics */
                    <div className="space-y-5">
                      {/* Visual Revenue Bar Comparison */}
                      <div className="space-y-2 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-amber-600 flex items-center gap-1">
                            👑 สมาชิก: {memberStats.memberRevenue.toLocaleString()} ฿ (
                            {payments.netTotal > 0 ? Math.round((memberStats.memberRevenue / payments.netTotal) * 100) : 0}%)
                          </span>
                          <span className="text-sky-600 flex items-center gap-1">
                            👤 ทั่วไป: {memberStats.nonMemberRevenue.toLocaleString()} ฿ (
                            {payments.netTotal > 0 ? Math.round((memberStats.nonMemberRevenue / payments.netTotal) * 100) : 0}%)
                          </span>
                        </div>
                        {/* Split Bar */}
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                          <div
                            className="bg-amber-500 h-full transition-all duration-300"
                            style={{ width: `${payments.netTotal > 0 ? Math.round((memberStats.memberRevenue / payments.netTotal) * 100) : 50}%` }}
                          />
                          <div
                            className="bg-sky-500 h-full transition-all duration-300"
                            style={{ width: `${payments.netTotal > 0 ? Math.round((memberStats.nonMemberRevenue / payments.netTotal) * 100) : 50}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats Breakdown */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1">
                          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">ยอดซื้อเฉลี่ย / บิลสมาชิก</p>
                          <p className="text-lg font-black text-amber-800">{memberStats.avgMemberSpend.toLocaleString()} ฿</p>
                          <p className="text-[10px] text-amber-600 font-semibold">{memberStats.memberOrderCount} บิล</p>
                        </div>

                        <div className="p-3.5 bg-sky-50/60 border border-sky-200/80 rounded-xl space-y-1">
                          <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">ยอดซื้อเฉลี่ย / บิลทั่วไป</p>
                          <p className="text-lg font-black text-sky-800">{memberStats.avgNonMemberSpend.toLocaleString()} ฿</p>
                          <p className="text-[10px] text-sky-600 font-semibold">{memberStats.nonMemberOrderCount} บิล</p>
                        </div>
                      </div>

                      {/* Points Discount Highlight */}
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold text-amber-900">มูลค่าส่วนลดจากการใช้แต้มสะสม</p>
                          <p className="text-[10px] font-semibold text-amber-700 mt-0.5">
                            ลูกค้าแลกแต้มรวม {memberStats.pointsRedeemed.toLocaleString()} แต้ม
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-amber-600">-{memberStats.pointsRedeemed.toLocaleString()} ฿</p>
                          <p className="text-[10px] font-bold text-slate-500">
                            {detailedPayments.totalDiscount > 0
                              ? `คิดเป็น ${Math.round((memberStats.pointsRedeemed / detailedPayments.totalDiscount) * 100)}% ของส่วนลดรวม`
                              : 'ส่วนลดแลกแต้ม'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========== Row 2: ช่องทางชำระเงิน & ส่วนลด (Card 3) + สรุป Void Logs (Card 4) ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Card 3: สรุปช่องทางชำระเงิน & ส่วนลด */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-extrabold text-slate-800">สรุปช่องทางชำระเงิน & ส่วนลด (Payment & Discounts)</h3>
                  </div>

                  {/* Payment methods breakdown */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">💵 เงินสด</span>
                      <p className="text-sm font-black text-slate-900">{detailedPayments.cashTotal.toLocaleString()} ฿</p>
                      <span className="text-[10px] text-slate-400 font-semibold">{detailedPayments.cashCount} บิล</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">📱 PromptPay</span>
                      <p className="text-sm font-black text-slate-900">{detailedPayments.promptpayTotal.toLocaleString()} ฿</p>
                      <span className="text-[10px] text-slate-400 font-semibold">{detailedPayments.promptpayCount} บิล</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">🔀 ชำระผสม</span>
                      <p className="text-sm font-black text-slate-900">{detailedPayments.mixedTotal.toLocaleString()} ฿</p>
                      <span className="text-[10px] text-slate-400 font-semibold">{detailedPayments.mixedCount} บิล</span>
                    </div>
                  </div>

                  {/* Discounts Summary */}
                  <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-rose-800">ส่วนลดการตลาดรวมที่ให้ลูกค้า</p>
                      <p className="text-[10px] font-medium text-rose-600">จากโปรโมชั่นและส่วนลดแต้มสมาชิก</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-rose-700">-{detailedPayments.totalDiscount.toLocaleString()} ฿</p>
                      <p className="text-[10px] font-semibold text-slate-500">จากยอดก่อนลด {detailedPayments.totalSubtotal.toLocaleString()} ฿</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Void Logs Summary Card (Compact) */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <h3 className="text-xs font-extrabold text-slate-800">สรุปการยกเลิกรายการอาหาร (Void Summary)</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl">
                        สูญเสีย {totalWaste.toLocaleString()} ฿
                      </span>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
                        {voidCount} ครั้ง
                      </span>
                    </div>
                  </div>

                  {voidCount > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {topVoidItems.map(([menuName, qty], idx) => {
                          const medals = ['🥇', '🥈', '🥉'];
                          return (
                            <div key={menuName} className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                              <span className="text-base">{medals[idx]}</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 truncate">{menuName}</div>
                                <div className="text-[10px] text-slate-500 font-semibold">{qty} ครั้ง</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setShowVoidModal(true)}
                        className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 hover:text-slate-900 transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-red-600" />
                        ดูรายละเอียดทั้งหมด ({voidCount} รายการ)
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs font-medium">
                      ไม่มีการยกเลิกรายการอาหารในช่วงเวลานี้
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========== Void Logs Modal ========== */}
            {showVoidModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowVoidModal(false)}>
                <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <h3 className="text-sm font-extrabold text-slate-900">ประวัติการยกเลิกรายการอาหาร (Void Audit Log)</h3>
                    </div>
                    <button
                      onClick={() => setShowVoidModal(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="overflow-auto max-h-[calc(85vh-60px)] p-6">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-slate-700 text-xs font-extrabold border-b border-slate-200 pb-3 bg-slate-50">
                          <th className="py-2.5 px-3">เวลา</th>
                          <th className="py-2.5 px-3">รายการอาหาร</th>
                          <th className="py-2.5 px-3 text-center">จำนวน</th>
                          <th className="py-2.5 px-3 text-right">มูลค่า</th>
                          <th className="py-2.5 px-3">สาเหตุการยกเลิก</th>
                          <th className="py-2.5 px-3 text-center">คืนสต็อก</th>
                          <th className="py-2.5 px-3">พนักงาน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                        {voidLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-500">
                              {new Date(log.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}{' '}
                              {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900">{log.menu_name}</td>
                            <td className="py-3 px-3 text-center font-bold text-slate-700">{log.quantity}</td>
                            <td className="py-3 px-3 text-right font-black text-rose-600">{log.total_amount} ฿</td>
                            <td className="py-3 px-3 text-slate-600 font-medium">{log.reason}</td>
                            <td className="py-3 px-3 text-center">
                              {log.restored_stock ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  คืนสต็อก
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                  วัตถุดิบเสียเปล่า
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-500">{log.employee_name}</td>
                          </tr>
                        ))}
                        {voidLogs.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 font-medium text-xs">
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
  );
};

