"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Receipt, X, CreditCard, Banknote, ArrowLeftRight,
  Tag, Gift, TrendingUp, RefreshCw, ChevronRight, Clock, Trash2
} from 'lucide-react';

// ========== Interfaces ==========

interface CompletedOrder {
  id: number;
  table_id: number;
  created_at: string;
  payment: {
    id: number;
    payment_method: 'cash' | 'promptpay' | 'mixed';
    subtotal: number;
    discount_amount: number;
    net_amount: number;
    points_earned: number;
    points_redeemed: number;
    created_at: string;
  } | null;
  promos: PaymentPromo[];
}

interface PaymentPromo {
  id: number;
  promotion_name: string;
  promotion_type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_value: number;
  free_items: { name: string; qty: number }[] | null;
}

interface OrderItemDetail {
  id: number;
  quantity: number;
  unit_price: number;
  discount_applied: number;
  notes: string | null;
  menu_items: { name: string } | null;
}

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

// ========== Component ==========

export const SalesHistory: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'voids'>('sales');
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [voidLogs, setVoidLogs] = useState<VoidLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [voidLoading, setVoidLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ========== Data Fetching ==========

  const fetchTodayOrders = async () => {
    try {
      setLoading(true);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // ดึง orders ที่ completed วันนี้
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, table_id, created_at')
        .eq('status', 'completed')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

      if (orderError) throw orderError;
      if (!orderData || orderData.length === 0) {
        setOrders([]);
        return;
      }

      // ดึง payments สำหรับ orders เหล่านี้
      const orderIds = orderData.map(o => o.id);
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('id, order_id, payment_method, subtotal, discount_amount, net_amount, points_earned, points_redeemed, created_at')
        .in('order_id', orderIds);

      if (paymentError) throw paymentError;

      // ดึง payment_promotions
      const paymentIds = (paymentData || []).map(p => p.id);
      let promoData: any[] = [];
      if (paymentIds.length > 0) {
        const { data: promos, error: promoError } = await supabase
          .from('payment_promotions')
          .select('id, payment_id, promotion_name, promotion_type, discount_value, free_items')
          .in('payment_id', paymentIds);

        if (promoError) throw promoError;
        promoData = promos || [];
      }

      // ประกอบข้อมูล
      const combined: CompletedOrder[] = orderData.map(order => {
        const payment = (paymentData || []).find(p => p.order_id === order.id);
        const promos = payment
          ? promoData.filter(pr => pr.payment_id === payment.id).map(pr => ({
              id: pr.id,
              promotion_name: pr.promotion_name,
              promotion_type: pr.promotion_type,
              discount_value: parseFloat(pr.discount_value),
              free_items: pr.free_items,
            }))
          : [];

        return {
          id: order.id,
          table_id: order.table_id,
          created_at: order.created_at,
          payment: payment ? {
            id: payment.id,
            payment_method: payment.payment_method,
            subtotal: parseFloat(payment.subtotal as any),
            discount_amount: parseFloat(payment.discount_amount as any),
            net_amount: parseFloat(payment.net_amount as any),
            points_earned: payment.points_earned,
            points_redeemed: payment.points_redeemed,
            created_at: payment.created_at,
          } : null,
          promos,
        };
      });

      setOrders(combined);
    } catch (err) {
      console.error('Error fetching sales history:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoidLogs = async () => {
    try {
      setVoidLoading(true);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('void_logs')
        .select('*')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVoidLogs((data || []) as VoidLog[]);
    } catch (err) {
      console.error('Error fetching void logs:', err);
    } finally {
      setVoidLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (activeSubTab === 'sales') {
      await fetchTodayOrders();
    } else {
      await fetchVoidLogs();
    }
  };

  const fetchOrderDetail = async (order: CompletedOrder) => {
    try {
      setDetailLoading(true);
      setSelectedOrder(order);

      const { data, error } = await supabase
        .from('order_items')
        .select('id, quantity, unit_price, discount_applied, notes, menu_items(name)')
        .eq('order_id', order.id)
        .neq('status', 'voided')
        .order('id', { ascending: true });

      if (error) throw error;
      setOrderItems((data || []) as unknown as OrderItemDetail[]);
    } catch (err) {
      console.error('Error fetching order detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayOrders();
    fetchVoidLogs();
  }, []);

  // ========== Computed Values ==========

  const totalRevenue = orders.reduce((s, o) => s + (o.payment?.net_amount || 0), 0);
  const totalDiscount = orders.reduce((s, o) => s + (o.payment?.discount_amount || 0), 0);
  const totalBills = orders.length;

  // ========== Helper Functions ==========

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-3.5 h-3.5" />;
      case 'promptpay': return <CreditCard className="w-3.5 h-3.5" />;
      case 'mixed': return <ArrowLeftRight className="w-3.5 h-3.5" />;
      default: return <Banknote className="w-3.5 h-3.5" />;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'เงินสด';
      case 'promptpay': return 'โอนเงิน';
      case 'mixed': return 'ผสม';
      default: return method;
    }
  };

  const getPromoTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage': return 'ลด %';
      case 'fixed': return 'ลดบาท';
      case 'buy_x_get_y': return 'ซื้อแถม';
      default: return type;
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  // ========== Render ==========

  return (
    <div className="bg-stone-950 text-white min-h-[calc(100vh-80px)] p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ส่วนหัว */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-850 pb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              ระบบประวัติและตรวจสอบ (Sales & Audit History)
            </h2>
            <p className="text-stone-400 text-xs mt-1">
              ตรวจสอบยอดขายรายบิล และประวัติการทำรายการยกเลิกออเดอร์ในวันนี้
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-xs font-bold text-stone-300 hover:text-white transition active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || voidLoading) ? 'animate-spin' : ''}`} />
            รีเฟรชข้อมูล
          </button>
        </div>

        {/* แถบ Tab ย่อย */}
        <div className="flex gap-2 border-b border-stone-900 pb-3">
          <button
            onClick={() => setActiveSubTab('sales')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeSubTab === 'sales'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-stone-900/40 border-stone-850 text-stone-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Receipt className="w-3.5 h-3.5" />
              ยอดขายวันนี้
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('voids')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeSubTab === 'voids'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-stone-900/40 border-stone-850 text-stone-400 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" />
              ประวัติการยกเลิก (Void Logs)
            </span>
          </button>
        </div>

        {activeSubTab === 'sales' ? (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* แถบสรุปสถิติ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-stone-400 text-xs font-medium">จำนวนบิลปิดแล้ว</div>
                    <div className="text-2xl font-black text-white">{totalBills} <span className="text-sm font-bold text-stone-500">บิล</span></div>
                  </div>
                  <div className="p-3 bg-blue-950/30 text-blue-400 rounded-xl border border-blue-900/25">
                    <Receipt className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-stone-400 text-xs font-medium">ยอดขายรวมวันนี้</div>
                    <div className="text-2xl font-black text-emerald-400">{totalRevenue.toLocaleString()} <span className="text-sm font-bold text-stone-500">฿</span></div>
                  </div>
                  <div className="p-3 bg-emerald-950/30 text-emerald-400 rounded-xl border border-emerald-900/25">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-stone-400 text-xs font-medium">ส่วนลดโปรโมชั่นรวม</div>
                    <div className="text-2xl font-black text-amber-500">{totalDiscount.toLocaleString()} <span className="text-sm font-bold text-stone-500">฿</span></div>
                  </div>
                  <div className="p-3 bg-amber-950/30 text-amber-400 rounded-xl border border-amber-900/25">
                    <Tag className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* รายชื่อบิล */}
              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl backdrop-blur-md overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-800">
                  <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    รายการบิลที่ปิดแล้ว ({totalBills} บิล)
                  </h3>
                </div>

                <div className="divide-y divide-stone-850">
                  {orders.map(order => (
                    <button
                      key={order.id}
                      onClick={() => fetchOrderDetail(order)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone-900/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        {/* หมายเลขบิล */}
                        <div className="w-10 h-10 bg-stone-800/60 border border-stone-750 rounded-xl flex items-center justify-center">
                          <span className="text-xs font-black text-stone-300">T{order.table_id}</span>
                        </div>

                        <div className="text-left">
                          <div className="text-xs font-bold text-stone-200">
                            ORD-{order.id}
                            <span className="text-stone-500 font-medium ml-2">โต๊ะ {order.table_id}</span>
                          </div>
                          <div className="text-[10px] text-stone-500 font-semibold mt-0.5">
                            ปิดบิลเวลา {order.payment ? formatTime(order.payment.created_at) : formatTime(order.created_at)} น.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Promotion badges */}
                        {order.promos.length > 0 && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            {order.promos.slice(0, 2).map(promo => (
                              <span key={promo.id} className="text-[10px] font-bold text-amber-400 bg-amber-950/30 border border-amber-900/30 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                                🏷️ {promo.promotion_name}
                              </span>
                            ))}
                            {order.promos.length > 2 && (
                              <span className="text-[10px] font-bold text-stone-500">+{order.promos.length - 2}</span>
                            )}
                          </div>
                        )}

                        {/* ยอดสุทธิ + วิธีชำระ */}
                        <div className="text-right">
                          <div className="text-sm font-black text-white">
                            {(order.payment?.net_amount || 0).toLocaleString()} ฿
                          </div>
                          {order.payment && (
                            <div className="flex items-center justify-end gap-1 text-[10px] text-stone-500 font-semibold mt-0.5">
                              {getPaymentIcon(order.payment.payment_method)}
                              <span>{getPaymentLabel(order.payment.payment_method)}</span>
                            </div>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-stone-400 transition-colors" />
                      </div>
                    </button>
                  ))}

                  {orders.length === 0 && (
                    <div className="py-16 text-center">
                      <Receipt className="w-10 h-10 text-stone-700 mx-auto mb-3" />
                      <p className="text-stone-500 text-xs font-semibold">ยังไม่มีบิลที่ปิดแล้วในวันนี้</p>
                      <p className="text-stone-600 text-[10px] mt-1">บิลจะแสดงที่นี่หลังจากปิดการขายและชำระเงินเสร็จ</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        ) : (
          voidLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-stone-900/40 border border-stone-850 rounded-2xl overflow-hidden backdrop-blur-md">
              <div className="px-6 py-4 border-b border-stone-800">
                <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  ประวัติการยกเลิกรายการอาหารวันนี้ ({voidLogs.length} รายการ)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400 text-xs font-bold bg-stone-900/50">
                      <th className="py-3.5 px-6">เวลา</th>
                      <th className="py-3.5 px-4">รายการอาหาร</th>
                      <th className="py-3.5 px-4 text-center">จำนวน</th>
                      <th className="py-3.5 px-4 text-right">มูลค่าสูญเสีย</th>
                      <th className="py-3.5 px-4">สาเหตุ</th>
                      <th className="py-3.5 px-4 text-center">คืนคลัง</th>
                      <th className="py-3.5 px-6">ผู้ทำรายการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850 text-xs">
                    {voidLogs.map(log => (
                      <tr key={log.id} className="hover:bg-stone-900/20 transition-colors">
                        <td className="py-4 px-6 text-stone-500 font-semibold">
                          {formatTime(log.created_at)} น.
                        </td>
                        <td className="py-4 px-4 font-bold text-stone-200">
                          {log.menu_name}
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-stone-300">
                          {log.quantity}
                        </td>
                        <td className="py-4 px-4 text-right font-black text-stone-100">
                          {Number(log.total_amount).toLocaleString()} ฿
                        </td>
                        <td className="py-4 px-4 text-stone-400">
                          {log.reason}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {log.restored_stock ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-full">
                              คืนสต็อก
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-400 bg-red-950/20 border border-red-900/30 px-2 py-0.5 rounded-full">
                              สูญเสีย
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-stone-400 font-medium">
                          {log.employee_name}
                        </td>
                      </tr>
                    ))}
                    {voidLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-stone-500 font-semibold text-xs">
                          ยังไม่มีการบันทึกรายการยกเลิกอาหารในวันนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {/* ========== Modal รายละเอียดบิล ========== */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div
            className="bg-stone-950 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* หัว Modal */}
            <div className="sticky top-0 bg-stone-950/95 backdrop-blur-md border-b border-stone-800 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-sm font-bold text-white">ORD-{selectedOrder.id}</h3>
                <p className="text-[10px] text-stone-500 font-semibold mt-0.5">
                  โต๊ะ {selectedOrder.table_id} — ปิดบิลเวลา {selectedOrder.payment ? formatTime(selectedOrder.payment.created_at) : formatTime(selectedOrder.created_at)} น.
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-stone-900 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="px-6 py-5 space-y-6">

                {/* รายการอาหาร */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">รายการอาหาร</h4>
                  <div className="space-y-2">
                    {orderItems.map(item => (
                      <div key={item.id} className="bg-stone-900/50 border border-stone-850 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <span className="text-xs font-bold text-stone-200">{item.menu_items?.name || 'ไม่ทราบชื่อ'}</span>
                            <span className="text-[10px] text-stone-500 font-semibold ml-2">x{item.quantity}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-white">
                              {(item.quantity * item.unit_price).toLocaleString()} ฿
                            </span>
                            {item.unit_price > 0 && item.quantity > 1 && (
                              <div className="text-[10px] text-stone-500 font-medium">
                                @ {item.unit_price.toLocaleString()} ฿
                              </div>
                            )}
                          </div>
                        </div>
                        {item.notes && (
                          <div className="mt-1.5 text-[10px] text-amber-500/80 font-medium">
                            📝 {item.notes}
                          </div>
                        )}
                        {item.discount_applied > 0 && (
                          <div className="mt-1 text-[10px] text-red-400/80 font-medium">
                            ส่วนลดรายการ: -{item.discount_applied.toLocaleString()} ฿
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* โปรโมชั่นที่ใช้ */}
                {selectedOrder.promos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">โปรโมชั่นที่ใช้</h4>
                    <div className="space-y-2">
                      {selectedOrder.promos.map(promo => (
                        <div key={promo.id} className="bg-amber-950/20 border border-amber-900/30 rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-xs font-bold text-amber-300">{promo.promotion_name}</span>
                              <span className="text-[10px] font-bold text-amber-500/60 bg-amber-950/40 px-1.5 py-0.5 rounded">
                                {getPromoTypeLabel(promo.promotion_type)}
                              </span>
                            </div>
                            <span className="text-xs font-black text-red-400">-{promo.discount_value.toLocaleString()} ฿</span>
                          </div>
                          {promo.free_items && promo.free_items.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {promo.free_items.map((fi, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[10px] text-emerald-400/80 font-medium">
                                  <Gift className="w-3 h-3" />
                                  <span>ฟรี: {fi.name} x{fi.qty}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* สรุปยอด */}
                {selectedOrder.payment && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">สรุปยอดชำระ</h4>
                    <div className="bg-stone-900/50 border border-stone-850 rounded-xl px-4 py-4 space-y-2.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-400 font-medium">ยอดรวม</span>
                        <span className="text-stone-200 font-bold">{selectedOrder.payment.subtotal.toLocaleString()} ฿</span>
                      </div>

                      {selectedOrder.promos.length > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-400 font-medium">ส่วนลดโปรโมชั่น</span>
                          <span className="text-red-400 font-bold">
                            -{selectedOrder.promos.reduce((s, p) => s + p.discount_value, 0).toLocaleString()} ฿
                          </span>
                        </div>
                      )}

                      {selectedOrder.payment.points_redeemed > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-400 font-medium">ส่วนลดแต้มสะสม ({selectedOrder.payment.points_redeemed} แต้ม)</span>
                          <span className="text-red-400 font-bold">-{selectedOrder.payment.points_redeemed.toLocaleString()} ฿</span>
                        </div>
                      )}

                      <div className="border-t border-stone-800 pt-2.5 flex justify-between">
                        <span className="text-sm font-bold text-white">ยอดสุทธิ</span>
                        <span className="text-sm font-black text-emerald-400">{selectedOrder.payment.net_amount.toLocaleString()} ฿</span>
                      </div>

                      <div className="border-t border-stone-850 pt-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
                          {getPaymentIcon(selectedOrder.payment.payment_method)}
                          <span>ชำระโดย: {getPaymentLabel(selectedOrder.payment.payment_method)}</span>
                        </div>
                        {selectedOrder.payment.points_earned > 0 && (
                          <div className="text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-2 py-0.5 rounded-full">
                            +{selectedOrder.payment.points_earned} แต้ม
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
