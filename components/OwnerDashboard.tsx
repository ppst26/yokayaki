"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp, ShoppingBag, Trash2, Award,
  DollarSign, Clock, ClipboardList
} from 'lucide-react';

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

interface HourlySales {
  hour: number;
  amount: number;
}

interface StockLog {
  id: number;
  menu_item_name: string;
  employee_name: string;
  old_stock: number;
  new_stock: number;
  change_amount: number;
  created_at: string;
}

export const OwnerDashboard: React.FC = () => {
  const [payments, setPayments] = useState<PaymentSummary>({ cashTotal: 0, promptpayTotal: 0, netTotal: 0, orderCount: 0 });
  const [voidLogs, setVoidLogs] = useState<VoidLog[]>([]);
  const [topSellers, setTopSellers] = useState<ItemSalesCount[]>([]);
  const [hourlySales, setHourlySales] = useState<HourlySales[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. ดึงยอดจ่ายวันนี้ (อิงเวลา 00:00 น. ของวันปัจจุบัน)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: payData, error: payError } = await supabase
        .from('payments')
        .select('payment_method, net_amount')
        .gte('created_at', todayStart.toISOString());

      if (payError) throw payError;

      let cashTotal = 0;
      let promptpayTotal = 0;
      let netTotal = 0;

      payData?.forEach(p => {
        const amt = parseFloat(p.net_amount as any);
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

      // 2. ดึงประวัติ Void Logs ทั้งหมด
      const { data: voidData, error: voidError } = await supabase
        .from('void_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (voidError) throw voidError;
      setVoidLogs((voidData || []) as VoidLog[]);

      // 3. ดึงยอดสั่งอาหารที่เสิร์ฟสำเร็จในวันนี้เพื่อคิดสถิติ
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
        .gte('created_at', todayStart.toISOString());

      if (salesError) throw salesError;

      const itemMap: { [key: string]: { quantity: number; revenue: number } } = {};
      const hoursMap: { [key: number]: number } = {};
      // ตั้งค่าเริ่มต้นชั่วโมงร้านเปิด (16:00 - 23:00 น.)
      for (let h = 16; h <= 23; h++) {
        hoursMap[h] = 0;
      }

      salesData?.forEach((item: any) => {
        const name = item.menu_items?.name || 'ไม่ทราบชื่อ';
        const qty = item.quantity;
        const rev = (item.unit_price * qty) - item.discount_applied;

        if (itemMap[name]) {
          itemMap[name].quantity += qty;
          itemMap[name].revenue += rev;
        } else {
          itemMap[name] = { quantity: qty, revenue: rev };
        }

        const hour = new Date(item.created_at).getHours();
        if (hour >= 16 && hour <= 23) {
          hoursMap[hour] = (hoursMap[hour] || 0) + rev;
        }
      });

      const topList = Object.keys(itemMap).map(name => ({
        name,
        quantity: itemMap[name].quantity,
        revenue: itemMap[name].revenue
      })).sort((a, b) => b.quantity - a.quantity);

      setTopSellers(topList);

      const hourlyList = Object.keys(hoursMap).map(h => ({
        hour: parseInt(h, 10),
        amount: hoursMap[parseInt(h, 10)]
      })).sort((a, b) => a.hour - b.hour);

      setHourlySales(hourlyList);

      // 4. ดึงประวัติการปรับปรุงสต็อกด้วยมือ (Stock Adjustment Logs)
      const { data: stockLogData, error: stockLogError } = await supabase
        .from('stock_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (stockLogError) throw stockLogError;
      setStockLogs((stockLogData || []) as StockLog[]);

    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalWaste = voidLogs
    .filter(log => !log.restored_stock)
    .reduce((sum, log) => sum + parseFloat(log.total_amount as any), 0);

  const maxHourlyAmount = Math.max(...hourlySales.map(h => h.amount), 500);

  return (
    <div className="bg-stone-950 text-white min-h-[calc(100vh-80px)] p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ส่วนหัวรายงาน */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-850 pb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              รายงานวิเคราะห์ยอดขายและระบบตรวจสอบ (Owner Dashboard)
            </h2>
            <p className="text-stone-400 text-xs mt-1">วิเคราะห์ข้อมูลยอดขาย รายละเอียดธุรกรรม และประวัติสูญเสียวัตถุดิบ (Void Logs)</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs font-bold text-stone-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            รีเฟรชข้อมูลแดชบอร์ด
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* กล่องสรุปสถิติตัวเลข */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-stone-400 text-xs font-medium">ยอดขายสุทธิวันนี้</div>
                  <div className="text-2xl font-black text-white">{payments.netTotal.toLocaleString()} ฿</div>
                </div>
                <div className="p-3 bg-emerald-950/30 text-emerald-400 rounded-xl border border-emerald-900/25">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-stone-400 text-xs font-medium">สแกนจ่าย PromptPay</div>
                  <div className="text-2xl font-black text-amber-500">{payments.promptpayTotal.toLocaleString()} ฿</div>
                </div>
                <div className="p-3 bg-amber-950/30 text-amber-400 rounded-xl border border-amber-900/25">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-stone-400 text-xs font-medium">ยอดเงินสดในเก๊ะ</div>
                  <div className="text-2xl font-black text-stone-200">{payments.cashTotal.toLocaleString()} ฿</div>
                </div>
                <div className="p-3 bg-stone-850 text-stone-300 rounded-xl border border-stone-800">
                  <ShoppingBag className="w-5 h-5" />
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

            {/* กราฟและเมนูขายดี */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* กราฟแท่งยอดขายรายชั่วโมง */}
              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-6 backdrop-blur-md lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-stone-200">กราฟยอดขายรายชั่วโมงวันนี้ (16:00 - 23:00 น.)</h3>
                </div>

                <div className="h-64 flex items-end justify-between gap-4 pt-6 px-2 border-b border-stone-800 relative">
                  {hourlySales.map(data => {
                    const pct = (data.amount / maxHourlyAmount) * 100;
                    return (
                      <div key={data.hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        {/* ป้ายแสดงตัวเลขเมื่อโฮเวอร์เมาส์ */}
                        <div className="absolute bottom-full mb-2 bg-stone-950 border border-stone-800 text-stone-200 text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl">
                          {data.amount.toLocaleString()} ฿
                        </div>
                        <div
                          style={{ height: `${Math.max(4, pct)}%` }}
                          className="w-full bg-gradient-to-t from-amber-600 to-amber-400 group-hover:from-amber-500 group-hover:to-yellow-400 rounded-t transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                        />
                        <span className="text-[10px] text-stone-500 font-semibold mt-2">{data.hour}:00</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* การจัดอันดับสินค้าขายดี */}
              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-6 backdrop-blur-md space-y-6">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-bold text-stone-200">จัดอันดับเมนูขายดีประจำวันนี้</h3>
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
                      ยังไม่มีรายการจำหน่ายในวันนี้
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ตารางแสดงรายงานประวัติการยกเลิกอาหาร (Void logs) */}
            <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-6 backdrop-blur-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-bold text-stone-200">ประวัติการยกเลิกรายการอาหาร (Void Audit Log)</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 font-medium">ยอดสูญเสียวัตถุดิบสะสม:</span>
                  <span className="text-sm font-black text-red-400 bg-red-950/20 border border-red-900/40 px-3 py-1 rounded-xl">
                    {totalWaste.toLocaleString()} ฿
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-stone-400 text-xs font-bold border-b border-stone-800 pb-3">
                      <th className="py-2.5">เวลา</th>
                      <th className="py-2.5">รายการอาหาร</th>
                      <th className="py-2.5 text-center">จำนวน</th>
                      <th className="py-2.5 text-right">มูลค่า</th>
                      <th className="py-2.5">สาเหตุการยกเลิก</th>
                      <th className="py-2.5 text-center">คืนสต็อก</th>
                      <th className="py-2.5">พนักงานผู้ยกเลิก</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850 text-xs text-stone-300">
                    {voidLogs.map(log => (
                      <tr key={log.id} className="hover:bg-stone-900/10 transition-colors">
                        <td className="py-3 font-semibold text-stone-500">
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

            {/* ตารางแสดงประวัติการปรับปรุงสต็อกด้วยมือ (Stock Adjustment Audit Log) */}
            <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-6 backdrop-blur-md space-y-6">
              <div className="flex items-center gap-2 border-b border-stone-800 pb-4">
                <ClipboardList className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-stone-200">ประวัติการปรับปรุงสต็อกด้วยมือ (Stock Adjustment Log)</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-stone-400 text-xs font-bold border-b border-stone-800 pb-3">
                      <th className="py-2.5">เวลา</th>
                      <th className="py-2.5">ชื่อเมนู</th>
                      <th className="py-2.5 text-center">สต็อกเดิม</th>
                      <th className="py-2.5 text-center">สต็อกใหม่</th>
                      <th className="py-2.5 text-center">จำนวนที่ปรับ</th>
                      <th className="py-2.5">ผู้ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850 text-xs text-stone-300">
                    {stockLogs.map(log => (
                      <tr key={log.id} className="hover:bg-stone-900/10 transition-colors">
                        <td className="py-3 font-semibold text-stone-500">
                          {new Date(log.created_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                        </td>
                        <td className="py-3 font-bold text-stone-200">{log.menu_item_name}</td>
                        <td className="py-3 text-center font-bold">{log.old_stock}</td>
                        <td className="py-3 text-center font-bold">{log.new_stock}</td>
                        <td className="py-3 text-center">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            log.change_amount > 0
                              ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/30'
                              : 'text-red-400 bg-red-950/30 border-red-900/30'
                          }`}>
                            {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-stone-400">{log.employee_name}</td>
                      </tr>
                    ))}
                    {stockLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-stone-500 font-medium text-xs">
                          ยังไม่มีประวัติการปรับปรุงสต็อกด้วยมือ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
