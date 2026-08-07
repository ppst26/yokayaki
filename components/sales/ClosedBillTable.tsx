"use client";

import React from 'react';
import { Receipt, ChevronRight, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';

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

interface ClosedBillTableProps {
  orders: CompletedOrder[];
  loading: boolean;
  fetchOrderDetail: (order: CompletedOrder) => void;
  getPaymentIcon: (method: string) => React.ReactNode;
  getPaymentLabel: (method: string) => string;
  formatTime: (dateStr: string) => string;
}

export const ClosedBillTable: React.FC<ClosedBillTableProps> = ({
  orders,
  loading,
  fetchOrderDetail,
  getPaymentIcon,
  getPaymentLabel,
  formatTime,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="text-center py-16 p-8">
        <Receipt className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">
          ยังไม่มีรายการปิดบิลในวันนี้
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <Card
          key={order.id}
          onClick={() => fetchOrderDetail(order)}
          className="p-4 flex items-center justify-between transition active:scale-98 cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="px-2.5 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-[10px] tracking-tight whitespace-nowrap shrink-0 shadow-xs">
              ORD-{order.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-neutral-100">
                  โต๊ะ {order.table_id}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-neutral-500 font-semibold">
                  • {formatTime(order.payment?.created_at || order.created_at)} น.
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-neutral-300 flex items-center gap-1">
                  {order.payment && getPaymentIcon(order.payment.payment_method)}
                  {order.payment && getPaymentLabel(order.payment.payment_method)}
                </span>
                {order.promos.length > 0 && (
                  <span className="text-[10px] font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-100 dark:border-red-900/50">
                    <Tag className="w-3 h-3" />
                    ใช้โปรโมชั่น ({order.promos.length})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-base font-black text-slate-900 dark:text-neutral-100 block">
                {order.payment?.net_amount.toLocaleString()} ฿
              </span>
              {order.payment && order.payment.discount_amount > 0 && (
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">
                  ประหยัด -{order.payment.discount_amount.toLocaleString()} ฿
                </span>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-neutral-500" />
          </div>
        </Card>
      ))}
    </div>
  );
};
