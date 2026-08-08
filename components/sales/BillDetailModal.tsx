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
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg md:text-xl font-black text-white">
                รายละเอียดบิล ORD-{selectedOrder.id}
              </h3>
              {selectedOrder.payment?.member_name && (
                <span className="text-xs font-black text-amber-400">
                  (คุณ{selectedOrder.payment.member_name})
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {detailLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* รายการอาหาร */}
              <div className="space-y-2">
                <h4 className="text-card-label">
                  รายการอาหาร
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {orderItems.map(item => (
                    <div
                      key={item.id}
                      className="py-2.5 px-1 hover:bg-slate-50/50 dark:hover:bg-neutral-800/30 transition"
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
                        <div className="mt-1 text-xs text-red-600 dark:text-red-400 font-semibold">
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
                <div className="space-y-1 pt-1">
                  <h4 className="text-card-label">
                    ข้อมูลลูกค้า & สมาชิก CRM
                  </h4>
                  <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                    <div>
                      <span className="text-base font-black text-slate-900 dark:text-neutral-100">
                        {selectedOrder.payment?.member_name
                          ? `คุณ${selectedOrder.payment.member_name}`
                          : 'ลูกค้าทั่วไป'}
                      </span>
                      {selectedOrder.payment?.phone_number && (
                        <span className="text-xs text-slate-500 dark:text-neutral-400 font-bold ml-2">
                          ({selectedOrder.payment.phone_number})
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {(selectedOrder.payment?.points_redeemed ?? 0) > 0 && (
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                          ใช้ไป {selectedOrder.payment?.points_redeemed} แต้ม (-{selectedOrder.payment?.points_redeemed} ฿)
                        </span>
                      )}
                      {(selectedOrder.payment?.points_earned ?? 0) > 0 && (
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          ได้รับ +{selectedOrder.payment?.points_earned} แต้ม
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* โปรโมชั่นที่ใช้ */}
              {selectedOrder.promos.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-card-label">
                    โปรโมชั่น & คูปองส่วนลดที่ใช้
                  </h4>
                  <div className="space-y-2 divide-y divide-slate-100 dark:divide-neutral-800">
                    {selectedOrder.promos.map(promo => (
                      <div
                        key={promo.id}
                        className="pt-2 first:pt-0 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                              <span className="text-sm font-extrabold text-slate-900 dark:text-neutral-100">
                                {promo.promotion_name}
                              </span>
                              <span className="text-xs font-bold text-red-600 dark:text-red-400">
                                ({getPromoTypeLabel(promo.promotion_type)})
                              </span>
                            </div>
                            {promo.coupon_code && (
                              <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold pl-6">
                                รหัสคูปอง: <span className="font-mono font-bold text-slate-800 dark:text-neutral-200">{promo.coupon_code}</span>
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-black text-rose-600 dark:text-rose-400 shrink-0">
                            -{promo.discount_value.toLocaleString()} ฿
                          </span>
                        </div>
                        {promo.free_items && promo.free_items.length > 0 && (
                          <div className="mt-1 space-y-1 pl-6">
                            {promo.free_items.map((fi, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold"
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
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-neutral-800">
                  <h4 className="text-card-label">
                    สรุปยอดชำระ
                  </h4>
                  <div className="space-y-2">
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

                    <div className="pt-2 flex justify-between items-center">
                      <span className="text-base font-extrabold text-slate-900 dark:text-neutral-100">
                        ยอดสุทธิ
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {selectedOrder.payment.net_amount.toLocaleString()} ฿
                      </span>
                    </div>

                    {/* Payment methods & Points earned */}
                    <div className="pt-2 space-y-2 text-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-slate-500 dark:text-neutral-400 font-semibold">
                          ช่องทางชำระเงิน:
                        </span>
                        <div className="flex items-center gap-4 font-black">
                          {selectedOrder.payment.cash_amount > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Banknote className="w-4 h-4" />
                              เงินสด {selectedOrder.payment.cash_amount.toLocaleString()} ฿
                            </span>
                          )}
                          {selectedOrder.payment.promptpay_amount > 0 && (
                            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Smartphone className="w-4 h-4" />
                              QR/โอน {selectedOrder.payment.promptpay_amount.toLocaleString()} ฿
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedOrder.payment.points_earned > 0 && (
                        <div className="flex items-center justify-between text-sm pt-0.5">
                          <span className="text-slate-500 dark:text-neutral-400 font-semibold">
                            แต้มสะสมได้รับ:
                          </span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            +{selectedOrder.payment.points_earned} แต้ม
                          </span>
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
