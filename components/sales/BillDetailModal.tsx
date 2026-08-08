"use client";

import React from 'react';
import { X, Tag, Gift, User, Banknote, Smartphone } from 'lucide-react';

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

interface BillDetailModalProps {
  selectedOrder: CompletedOrder | null;
  setSelectedOrder: (order: CompletedOrder | null) => void;
  orderItems: OrderItemDetail[];
  detailLoading: boolean;
  getPaymentIcon: (method: string) => React.ReactNode;
  getPaymentLabel: (method: string) => string;
  getPromoTypeLabel: (type: string) => string;
  formatTime: (dateStr: string) => string;
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({
  selectedOrder,
  setSelectedOrder,
  orderItems,
  detailLoading,
  getPaymentIcon,
  getPaymentLabel,
  getPromoTypeLabel,
  formatTime,
}) => {
  if (!selectedOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-neutral-800 text-white flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg md:text-xl font-black text-white">
                รายละเอียดบิล ORD-{selectedOrder.id}
              </h3>
              {selectedOrder.payment?.member_name && (
                <span className="text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  คุณ{selectedOrder.payment.member_name}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-neutral-300 font-semibold flex items-center gap-2 flex-wrap">
              <span>โต๊ะ {selectedOrder.table_id}</span>
              <span>•</span>
              <span>ปิดบิลเวลา {formatTime(selectedOrder.payment?.created_at || selectedOrder.created_at)} น.</span>
            </p>
          </div>
          <button
            onClick={() => setSelectedOrder(null)}
            className="p-2 text-neutral-300 hover:text-white rounded-full cursor-pointer transition active:scale-95 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {detailLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* รายการอาหาร */}
              <div className="space-y-3">
                <h4 className="text-card-label">
                  รายการอาหาร
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {orderItems.map(item => (
                    <div
                      key={item.id}
                      className="py-3 px-1 hover:bg-slate-50/50 dark:hover:bg-neutral-800/30 transition rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                            {item.menu_items?.name || 'ไม่ทราบชื่อ'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-neutral-400 font-extrabold ml-2">
                            x{item.quantity}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-neutral-100">
                            {(item.quantity * item.unit_price).toLocaleString()} ฿
                          </span>
                          {item.unit_price > 0 && item.quantity > 1 && (
                            <div className="text-xs text-slate-400 dark:text-neutral-500 font-medium">
                              @ {item.unit_price.toLocaleString()} ฿
                            </div>
                          )}
                        </div>
                      </div>
                      {item.notes && (
                        <div className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">
                          📝 {item.notes}
                        </div>
                      )}
                      {item.discount_applied > 0 && (
                        <div className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                          ส่วนลดรายการ: -{item.discount_applied.toLocaleString()} ฿
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ข้อมูลลูกค้า & สมาชิก CRM */}
              {(selectedOrder.payment?.member_name || selectedOrder.payment?.phone_number || (selectedOrder.payment?.points_earned ?? 0) > 0 || (selectedOrder.payment?.points_redeemed ?? 0) > 0) && (
                <div className="space-y-3 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl">
                  <h4 className="text-card-label text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    ข้อมูลลูกค้า & สมาชิก CRM
                  </h4>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-neutral-100">
                        {selectedOrder.payment?.member_name
                          ? `คุณ${selectedOrder.payment.member_name}`
                          : 'ลูกค้าทั่วไป'}
                      </p>
                      {selectedOrder.payment?.phone_number && (
                        <p className="text-xs text-slate-500 dark:text-neutral-400 font-bold mt-0.5">
                          เบอร์โทร: <span className="font-mono text-slate-800 dark:text-neutral-200">{selectedOrder.payment.phone_number}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(selectedOrder.payment?.points_redeemed ?? 0) > 0 && (
                        <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-3 py-1 rounded-xl">
                          ใช้ไป {selectedOrder.payment?.points_redeemed} แต้ม (-{selectedOrder.payment?.points_redeemed} ฿)
                        </span>
                      )}
                      {(selectedOrder.payment?.points_earned ?? 0) > 0 && (
                        <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 px-3 py-1 rounded-xl">
                          ได้รับ +{selectedOrder.payment?.points_earned} แต้ม
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* โปรโมชั่นที่ใช้ */}
              {selectedOrder.promos.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-card-label">
                    โปรโมชั่น & คูปองส่วนลดที่ใช้
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.promos.map(promo => (
                      <div
                        key={promo.id}
                        className="py-2.5 px-3 bg-slate-50 dark:bg-neutral-800/60 rounded-xl space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                              <span className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                                {promo.promotion_name}
                              </span>
                              <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-lg">
                                {getPromoTypeLabel(promo.promotion_type)}
                              </span>
                            </div>
                            {promo.coupon_code && (
                              <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold pl-6">
                                รหัสคูปอง:{' '}
                                <span className="font-mono font-bold bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 px-2 py-0.5 rounded-lg text-xs">
                                  {promo.coupon_code}
                                </span>
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-black text-rose-600 dark:text-rose-400 shrink-0">
                            -{promo.discount_value.toLocaleString()} ฿
                          </span>
                        </div>
                        {promo.free_items && promo.free_items.length > 0 && (
                          <div className="mt-2 space-y-1 pl-6">
                            {promo.free_items.map((fi, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-bold"
                              >
                                <Gift className="w-3.5 h-3.5" />
                                <span>
                                  ฟรี: {fi.name} x{fi.qty}
                                </span>
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
                  <h4 className="text-card-label">
                    สรุปยอดชำระ
                  </h4>
                  <div className="py-2 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-neutral-400 font-semibold">
                        ยอดรวม
                      </span>
                      <span className="text-slate-900 dark:text-neutral-100 font-bold">
                        {selectedOrder.payment.subtotal.toLocaleString()} ฿
                      </span>
                    </div>

                    {selectedOrder.promos.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-neutral-400 font-semibold">
                          ส่วนลดโปรโมชั่น
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          -
                          {selectedOrder.promos
                            .reduce((s, p) => s + p.discount_value, 0)
                            .toLocaleString()}{' '}
                          ฿
                        </span>
                      </div>
                    )}

                    {selectedOrder.payment.points_redeemed > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-neutral-400 font-semibold">
                          ส่วนลดแต้มสะสม ({selectedOrder.payment.points_redeemed} แต้ม)
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          -{selectedOrder.payment.points_redeemed.toLocaleString()} ฿
                        </span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 dark:border-neutral-800 pt-3 flex justify-between items-center">
                      <span className="text-base font-bold text-slate-900 dark:text-neutral-100">
                        ยอดสุทธิ
                      </span>
                      <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {selectedOrder.payment.net_amount.toLocaleString()} ฿
                      </span>
                    </div>

                    <div className="border-t border-slate-200 dark:border-neutral-800 pt-3 space-y-3">
                      {/* Payment split boxes */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* เงินสด */}
                        <div className={`rounded-2xl p-3.5 space-y-1 ${
                          selectedOrder.payment.cash_amount > 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40'
                            : 'bg-slate-50 dark:bg-neutral-800/50 opacity-50'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <Banknote className={`w-4 h-4 ${
                              selectedOrder.payment.cash_amount > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400'
                            }`} />
                            <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                              เงินสด
                            </span>
                          </div>
                          <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
                            {selectedOrder.payment.cash_amount > 0
                              ? `${selectedOrder.payment.cash_amount.toLocaleString()} ฿`
                              : '—'
                            }
                          </p>
                        </div>

                        {/* QR / โอน */}
                        <div className={`rounded-2xl p-3.5 space-y-1 ${
                          selectedOrder.payment.promptpay_amount > 0
                            ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40'
                            : 'bg-slate-50 dark:bg-neutral-800/50 opacity-50'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <Smartphone className={`w-4 h-4 ${
                              selectedOrder.payment.promptpay_amount > 0
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-400'
                            }`} />
                            <span className="text-xs font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                              QR / โอน
                            </span>
                          </div>
                          <p className="text-base font-black text-blue-700 dark:text-blue-300">
                            {selectedOrder.payment.promptpay_amount > 0
                              ? `${selectedOrder.payment.promptpay_amount.toLocaleString()} ฿`
                              : '—'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Points earned badge */}
                      {selectedOrder.payment.points_earned > 0 && (
                        <div className="flex justify-end pt-1">
                          <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 px-3.5 py-1 rounded-full flex items-center gap-1">
                            <span>ได้รับแต้มสะสม:</span>
                            <span className="text-sm font-black">+{selectedOrder.payment.points_earned} แต้ม</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
