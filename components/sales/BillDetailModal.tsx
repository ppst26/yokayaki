"use client";

import React from 'react';
import { X, Tag, Gift, User } from 'lucide-react';

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
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-neutral-800/80 border-b border-slate-200/80 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
              รายละเอียดบิล ORD-{selectedOrder.id}
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold">
              โต๊ะ {selectedOrder.table_id} • ปิดบิลเวลา{' '}
              {formatTime(selectedOrder.payment?.created_at || selectedOrder.created_at)} น.
            </p>
          </div>
          <button
            onClick={() => setSelectedOrder(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {detailLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* รายการอาหาร */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                  รายการอาหาร
                </h4>
                <div className="space-y-2">
                  {orderItems.map(item => (
                    <div
                      key={item.id}
                      className="bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-neutral-100">
                            {item.menu_items?.name || 'ไม่ทราบชื่อ'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-bold ml-2">
                            x{item.quantity}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 dark:text-neutral-100">
                            {(item.quantity * item.unit_price).toLocaleString()} ฿
                          </span>
                          {item.unit_price > 0 && item.quantity > 1 && (
                            <div className="text-[10px] text-slate-400 dark:text-neutral-500 font-medium">
                              @ {item.unit_price.toLocaleString()} ฿
                            </div>
                          )}
                        </div>
                      </div>
                      {item.notes && (
                        <div className="mt-1.5 text-[10px] text-red-600 dark:text-red-400 font-medium">
                          📝 {item.notes}
                        </div>
                      )}
                      {item.discount_applied > 0 && (
                        <div className="mt-1 text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                          ส่วนลดรายการ: -{item.discount_applied.toLocaleString()} ฿
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ข้อมูลสมาชิก CRM (ถ้ามี) */}
              {selectedOrder.payment?.phone_number && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                    ข้อมูลสมาชิก CRM
                  </h4>
                  <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-neutral-100">
                          {selectedOrder.payment.member_name
                            ? `คุณ${selectedOrder.payment.member_name}`
                            : 'สมาชิก CRM'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-semibold">
                          เบอร์โทร: <span className="font-mono">{selectedOrder.payment.phone_number}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {selectedOrder.payment.points_earned > 0 && (
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 block">
                          +{selectedOrder.payment.points_earned} แต้ม
                        </span>
                      )}
                      {selectedOrder.payment.points_redeemed > 0 && (
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">
                          ใช้ไป {selectedOrder.payment.points_redeemed} แต้ม
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* โปรโมชั่นที่ใช้ */}
              {selectedOrder.promos.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                    โปรโมชั่น & คูปองส่วนลดที่ใช้
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.promos.map(promo => (
                      <div
                        key={promo.id}
                        className="bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl px-4 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                              <span className="text-xs font-bold text-red-800 dark:text-red-300">
                                {promo.promotion_name}
                              </span>
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded">
                                {getPromoTypeLabel(promo.promotion_type)}
                              </span>
                            </div>
                            {promo.coupon_code && (
                              <p className="text-[11px] text-red-700 dark:text-red-300 font-semibold pl-5">
                                รหัสคูปอง:{' '}
                                <span className="font-mono font-bold bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-900 px-1.5 py-0.2 rounded text-[10px]">
                                  {promo.coupon_code}
                                </span>
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                            -{promo.discount_value.toLocaleString()} ฿
                          </span>
                        </div>
                        {promo.free_items && promo.free_items.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {promo.free_items.map((fi, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold"
                              >
                                <Gift className="w-3 h-3" />
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
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                    สรุปยอดชำระ
                  </h4>
                  <div className="bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-4 py-4 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-neutral-400 font-medium">
                        ยอดรวม
                      </span>
                      <span className="text-slate-800 dark:text-neutral-200 font-bold">
                        {selectedOrder.payment.subtotal.toLocaleString()} ฿
                      </span>
                    </div>

                    {selectedOrder.promos.length > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 dark:text-neutral-400 font-medium">
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
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 dark:text-neutral-400 font-medium">
                          ส่วนลดแต้มสะสม ({selectedOrder.payment.points_redeemed} แต้ม)
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          -{selectedOrder.payment.points_redeemed.toLocaleString()} ฿
                        </span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 dark:border-neutral-700 pt-2.5 flex justify-between">
                      <span className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                        ยอดสุทธิ
                      </span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {selectedOrder.payment.net_amount.toLocaleString()} ฿
                      </span>
                    </div>

                    <div className="border-t border-slate-200 dark:border-neutral-700 pt-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-300 font-semibold">
                        {getPaymentIcon(selectedOrder.payment.payment_method)}
                        <span>
                          ชำระโดย: {getPaymentLabel(selectedOrder.payment.payment_method)}
                        </span>
                      </div>
                      {selectedOrder.payment.points_earned > 0 && (
                        <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-full">
                          +{selectedOrder.payment.points_earned} แต้ม
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
