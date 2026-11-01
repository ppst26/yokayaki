"use client";

import React, { useState } from 'react';
import { Receipt, ChevronRight, Tag, Printer, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SalesReceiptPrint } from './SalesReceiptPrint';

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
  table_id: string;
  table_number?: number;
  status?: 'completed' | 'voided';
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
  auditSubtotal?: number;
}

interface ClosedBillTableProps {
  orders: CompletedOrder[];
  loading: boolean;
  fetchOrderDetail: (order: CompletedOrder) => void;
  getPaymentIcon: (method: string) => React.ReactNode;
  getPaymentLabel: (method: string) => string;
  formatTime: (dateStr: string) => string;
  auditMode?: boolean;
}

export const ClosedBillTable: React.FC<ClosedBillTableProps> = ({
  orders,
  loading,
  fetchOrderDetail,
  getPaymentIcon,
  getPaymentLabel,
  formatTime,
  auditMode = false,
}) => {
  const [receiptOrder, setReceiptOrder] = useState<CompletedOrder | null>(null);
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
          ยังไม่มีรายการปิดบิลในช่วงเวลานี้
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {orders.map(order => {
        const isVoided = order.status === 'voided';
        return (
          <Card
            key={order.id}
            onClick={() => fetchOrderDetail(order)}
            className={`p-3 sm:p-4 flex items-center justify-between transition active:scale-98 cursor-pointer gap-2 sm:gap-4 ${
              isVoided
                ? 'opacity-80 bg-rose-50/20 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/30'
                : ''
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
              <div
                className={`px-2.5 h-8 sm:px-3 sm:h-9 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm tracking-tight whitespace-nowrap shrink-0 ${
                  isVoided
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40'
                    : 'nav-active'
                }`}
              >
                ORD-{order.id}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-neutral-100 whitespace-nowrap">
                    โต๊ะ {order.table_number ?? order.table_id}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-400 dark:text-neutral-500 font-medium whitespace-nowrap">
                    • {formatTime(order.payment?.created_at || order.created_at)} น.
                  </span>
                  {isVoided && (
                    <span className="text-[10px] sm:text-xs font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/50 shrink-0">
                      ยกเลิกแล้ว (Voided)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap sm:flex-nowrap">
                  {!auditMode && order.payment && (
                    <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-neutral-300 flex items-center gap-1 whitespace-nowrap shrink-0">
                      {getPaymentIcon(order.payment.payment_method)}
                      {getPaymentLabel(order.payment.payment_method)}
                    </span>
                  )}
                  {!auditMode && order.promos.length > 0 && (
                    <span className="text-[11px] sm:text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-100 dark:border-red-900/50 whitespace-nowrap shrink-0">
                      <Tag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      ใช้โปรโมชั่น ({order.promos.length})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* ปุ่มพิมพ์ใบเสร็จ */}
              {!auditMode && order.payment && !isVoided && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReceiptOrder(order);
                  }}
                  className="p-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition cursor-pointer active:scale-95 shrink-0"
                  aria-label={`พิมพ์ใบเสร็จ ORD-${order.id}`}
                  title="พิมพ์ใบเสร็จ"
                >
                  <Printer className="w-4 h-4" />
                </button>
              )}
              <div className="text-right whitespace-nowrap">
                <span
                  className={`text-sm sm:text-base font-black block whitespace-nowrap ${
                    isVoided
                      ? 'line-through text-slate-400 dark:text-neutral-500'
                      : 'text-slate-900 dark:text-neutral-100'
                  }`}
                >
                  {(auditMode
                    ? (order.auditSubtotal ?? 0)
                    : (order.payment?.net_amount ?? 0)
                  ).toLocaleString()}{' '}
                  ฿
                </span>
                {!auditMode && order.payment && order.payment.discount_amount > 0 && (
                  <span
                    className={`text-[11px] sm:text-xs font-bold block whitespace-nowrap ${
                      isVoided ? 'line-through text-slate-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    ประหยัด -{order.payment.discount_amount.toLocaleString()} ฿
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-neutral-500 shrink-0" />
            </div>
          </Card>
        );
      })}

      {/* Receipt Print Modal */}
      {receiptOrder && (
        <SalesReceiptPrint
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
};
