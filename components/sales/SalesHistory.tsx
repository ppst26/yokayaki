"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Banknote, CreditCard, ArrowLeftRight } from 'lucide-react';
import { SalesSummaryCards } from './SalesSummaryCards';
import { ClosedBillTable } from './ClosedBillTable';
import { VoidLogsTable } from './VoidLogsTable';
import { BillDetailModal } from './BillDetailModal';

interface PaymentPromo {
  id: number;
  promotion_name: string;
  promotion_type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_value: number;
  free_items: { name: string; qty: number }[] | null;
  coupon_code?: string | null;
}

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
    cash_amount: number;
    promptpay_amount: number;
    points_earned: number;
    points_redeemed: number;
    phone_number?: string | null;
    member_name?: string | null;
    created_at: string;
  } | null;
  promos: PaymentPromo[];
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

export const SalesHistory: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'voids'>('sales');
  const [auditRange, setAuditRange] = useState<'today' | 'yesterday'>('today');
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [voidLogs, setVoidLogs] = useState<VoidLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [voidLoading, setVoidLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const getDateRange = (range: 'today' | 'yesterday') => {
    const start = new Date();
    const end = new Date();

    if (range === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { startISO: start.toISOString(), endISO: end.toISOString() };
  };

  const fetchOrdersForRange = async (range: 'today' | 'yesterday') => {
    try {
      setLoading(true);
      const { startISO, endISO } = getDateRange(range);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, table_id, created_at')
        .eq('status', 'completed')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false });

      if (orderError) throw orderError;
      if (!orderData || orderData.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = orderData.map(o => o.id);
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select(
          'id, order_id, payment_method, subtotal, discount_amount, net_amount, cash_amount, promptpay_amount, points_earned, points_redeemed, phone_number, created_at'
        )
        .in('order_id', orderIds);

      if (paymentError) throw paymentError;

      // Fetch member names separately
      const phoneNumbers = Array.from(
        new Set((paymentData || []).map(p => p.phone_number).filter((p): p is string => Boolean(p)))
      );
      const memberMap: Record<string, string> = {};
      if (phoneNumbers.length > 0) {
        const { data: memberData } = await supabase
          .from('loyalty_members')
          .select('phone_number, name')
          .in('phone_number', phoneNumbers);
        if (memberData) {
          memberData.forEach(m => {
            memberMap[m.phone_number] = m.name;
          });
        }
      }

      const paymentIds = (paymentData || []).map(p => p.id);
      let promoData: any[] = [];
      if (paymentIds.length > 0) {
        const { data: promos, error: promoError } = await supabase
          .from('payment_promotions')
          .select(
            'id, payment_id, promotion_name, promotion_type, discount_value, free_items, promotion_id'
          )
          .in('payment_id', paymentIds);

        if (promoError) throw promoError;

        // Fetch coupon codes from promotions separately
        const promoIds = Array.from(
          new Set((promos || []).map(pr => pr.promotion_id).filter(Boolean))
        );
        const promoCodeMap: Record<number, string> = {};
        if (promoIds.length > 0) {
          const { data: promoInfo } = await supabase
            .from('promotions')
            .select('id, coupon_code')
            .in('id', promoIds);
          if (promoInfo) {
            promoInfo.forEach(p => {
              if (p.coupon_code) promoCodeMap[p.id] = p.coupon_code;
            });
          }
        }

        promoData = (promos || []).map(pr => ({
          ...pr,
          coupon_code: pr.promotion_id ? promoCodeMap[pr.promotion_id] || null : null,
        }));
      }

      const combined: CompletedOrder[] = orderData.map(order => {
        const payment = (paymentData || []).find(p => p.order_id === order.id);
        const promos = payment
          ? promoData
              .filter(pr => pr.payment_id === payment.id)
              .map(pr => ({
                id: pr.id,
                promotion_name: pr.promotion_name,
                promotion_type: pr.promotion_type,
                discount_value: parseFloat(pr.discount_value),
                free_items: pr.free_items,
                coupon_code: pr.coupon_code,
              }))
          : [];

        return {
          id: order.id,
          table_id: order.table_id,
          created_at: order.created_at,
          payment: payment
            ? {
                id: payment.id,
                payment_method: payment.payment_method,
                subtotal: parseFloat(payment.subtotal as any),
                discount_amount: parseFloat(payment.discount_amount as any),
                net_amount: parseFloat(payment.net_amount as any),
                cash_amount: parseFloat(payment.cash_amount as any) || 0,
                promptpay_amount: parseFloat(payment.promptpay_amount as any) || 0,
                points_earned: payment.points_earned,
                points_redeemed: payment.points_redeemed,
                phone_number: payment.phone_number || null,
                member_name: payment.phone_number ? memberMap[payment.phone_number] || null : null,
                created_at: payment.created_at,
              }
            : null,
          promos,
        };
      });

      setOrders(combined);
    } catch (err: any) {
      console.error('Error fetching sales history:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoidLogsForRange = async (range: 'today' | 'yesterday') => {
    try {
      setVoidLoading(true);
      const { startISO, endISO } = getDateRange(range);

      const { data, error } = await supabase
        .from('void_logs')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
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
      await fetchOrdersForRange(auditRange);
    } else {
      await fetchVoidLogsForRange(auditRange);
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
    fetchOrdersForRange(auditRange);
    fetchVoidLogsForRange(auditRange);
  }, [auditRange]);

  const totalRevenue = orders.reduce((s, o) => s + (o.payment?.net_amount || 0), 0);
  const totalDiscount = orders.reduce((s, o) => s + (o.payment?.discount_amount || 0), 0);
  const totalBills = orders.length;
  const totalVoidCount = voidLogs.length;
  const totalVoidAmount = voidLogs.reduce((s, l) => s + Number(l.total_amount || 0), 0);

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-3.5 h-3.5" />;
      case 'promptpay':
        return <CreditCard className="w-3.5 h-3.5" />;
      case 'mixed':
        return <ArrowLeftRight className="w-3.5 h-3.5" />;
      default:
        return <Banknote className="w-3.5 h-3.5" />;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'เงินสด';
      case 'promptpay':
        return 'โอนเงิน';
      case 'mixed':
        return 'ผสม';
      default:
        return method;
    }
  };

  const getPromoTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'ลด %';
      case 'fixed':
        return 'ลดบาท';
      case 'buy_x_get_y':
        return 'ซื้อแถม';
      default:
        return type;
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-neutral-100 tracking-tight">
            ประวัติการขายประจำวัน (Sales & Audit History)
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 font-semibold mt-0.5">
            ตรวจสอบรายการที่เช็คบิลแล้ว และประวัติการ Void ยกเลิกออเดอร์ ({auditRange === 'today' ? 'ในวันนี้' : 'ของเมื่อวาน'})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Today / Yesterday Toggle Pills */}
          <div className="bg-slate-100 dark:bg-neutral-800/80 p-1 rounded-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAuditRange('today')}
              className={`px-3.5 py-2 rounded-xl text-sm font-black transition cursor-pointer ${
                auditRange === 'today'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/25 border-none'
                  : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-neutral-100 border-none'
              }`}
            >
              วันนี้ (Today)
            </button>
            <button
              type="button"
              onClick={() => setAuditRange('yesterday')}
              className={`px-3.5 py-2 rounded-xl text-sm font-black transition cursor-pointer ${
                auditRange === 'yesterday'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/25 border-none'
                  : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-neutral-100 border-none'
              }`}
            >
              เมื่อวาน (Yesterday)
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 rounded-xl text-sm font-bold transition active:scale-95 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Sales Summary Cards */}
      <SalesSummaryCards
        totalRevenue={totalRevenue}
        totalDiscount={totalDiscount}
        totalBills={totalBills}
        totalVoidCount={totalVoidCount}
        totalVoidAmount={totalVoidAmount}
      />

      {/* Sub Tabs Toggle */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-neutral-800 pb-3">
        <button
          onClick={() => setActiveSubTab('sales')}
          className={`px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer ${
            activeSubTab === 'sales'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/25 border-none'
              : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 hover:bg-slate-100/60 dark:hover:bg-neutral-800/60 border-none'
          }`}
        >
          รายการการขายวันนี้ ({orders.length})
        </button>

        <button
          onClick={() => setActiveSubTab('voids')}
          className={`px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer ${
            activeSubTab === 'voids'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/25 border-none'
              : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 hover:bg-slate-100/60 dark:hover:bg-neutral-800/60 border-none'
          }`}
        >
          ประวัติการ Void ยกเลิกรายการ ({voidLogs.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'sales' ? (
        <ClosedBillTable
          orders={orders}
          loading={loading}
          fetchOrderDetail={fetchOrderDetail}
          getPaymentIcon={getPaymentIcon}
          getPaymentLabel={getPaymentLabel}
          formatTime={formatTime}
        />
      ) : (
        <VoidLogsTable
          voidLogs={voidLogs}
          voidLoading={voidLoading}
          formatTime={formatTime}
        />
      )}

      {/* Bill Detail Modal */}
      <BillDetailModal
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
        orderItems={orderItems}
        detailLoading={detailLoading}
        getPaymentIcon={getPaymentIcon}
        getPaymentLabel={getPaymentLabel}
        getPromoTypeLabel={getPromoTypeLabel}
        formatTime={formatTime}
      />
    </div>
  );
};
