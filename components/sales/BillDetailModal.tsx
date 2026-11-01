"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Tag, Gift, User, Banknote, Smartphone, Trash2, ShieldAlert } from 'lucide-react';
import { VoidBillModal } from './VoidBillModal';

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
}

interface OrderItemDetail {
  id: number;
  quantity: number;
  unit_price: number;
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
  auditMode?: boolean;
  onOrderVoided?: () => void;
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
  auditMode = false,
  onOrderVoided,
}) => {
  const [mounted, setMounted] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and handle ESC key when modal is open
  useEffect(() => {
    if (!selectedOrder) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showVoidModal) setSelectedOrder(null);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedOrder, setSelectedOrder, showVoidModal]);

  if (!mounted || !selectedOrder) return null;

  const isVoided = selectedOrder.status === 'voided';

  return createPortal(
    <>
      <div
        onClick={() => setSelectedOrder(null)}
        className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 md:p-6 app-dialog-backdrop animate-backdrop-in"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="app-dialog w-full max-w-lg overflow-hidden flex flex-col h-[82dvh] sm:h-[640px] max-h-[85dvh] sm:max-h-[85vh] my-auto shadow-2xl rounded-2xl border border-zinc-200/20 dark:border-zinc-700/40"
        >
          {/* Modal Header */}
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-neutral-800 text-white flex items-center justify-between shrink-0 border-b border-neutral-700/50">
            <div className="space-y-0.5 min-w-0 pr-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg md:text-xl font-black text-white">
                  รายละเอียดบิล ORD-{selectedOrder.id}
                </h3>
                {isVoided ? (
                  <span className="px-2 py-0.5 rounded-md text-xs font-black bg-rose-600 text-white shrink-0">
                    ยกเลิกแล้ว (Voided)
                  </span>
                ) : null}
                {selectedOrder.payment?.member_name ? (
                  <span className="text-xs sm:text-sm font-black text-emerald-400">
                    ({selectedOrder.payment.member_name})
                  </span>
                ) : selectedOrder.payment?.phone_number ? (
                  <span className="text-xs sm:text-sm font-black text-emerald-400">
                    ({selectedOrder.payment.phone_number})
                  </span>
                ) : null}
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 font-semibold flex items-center gap-2 flex-wrap">
                <span>โต๊ะ {selectedOrder.table_number ?? selectedOrder.table_id}</span>
                <span>•</span>
                <span>ปิดบิลเวลา {formatTime(selectedOrder.payment?.created_at || selectedOrder.created_at)} น.</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="p-2 text-neutral-300 hover:text-white rounded-full cursor-pointer transition active:scale-95 shrink-0"
              aria-label="ปิดหน้ารายละเอียดบิล"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content (Scrollable) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 overscroll-contain">
            {detailLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* รายการอาหาร */}
                <div className="space-y-2">
                  <h4 className="text-card-label">
                    รายการอาหาร ({orderItems.reduce((sum, item) => sum + item.quantity, 0)} รายการ)
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                    {orderItems.map((item) => (
                      <div key={item.id} className="py-2.5 flex justify-between items-start text-sm">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="font-bold text-slate-800 dark:text-neutral-200">
                            {item.menu_items?.name || 'รายการไม่ระบุชื่อ'}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                              หมายเหตุ: {item.notes}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 dark:text-neutral-500">
                            {item.quantity} x {item.unit_price.toLocaleString()} ฿
                          </p>
                        </div>
                        <span className="font-extrabold text-slate-900 dark:text-neutral-100 shrink-0">
                          {(item.quantity * item.unit_price).toLocaleString()} ฿
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* โปรโมชั่นที่ใช้ */}
                {selectedOrder.promos.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <h4 className="text-card-label">
                      โปรโมชั่นที่ใช้ ({selectedOrder.promos.length})
                    </h4>
                    <div className="space-y-1.5">
                      {selectedOrder.promos.map((promo) => (
                        <div
                          key={promo.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200/60 dark:border-neutral-700/40 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="font-bold text-slate-800 dark:text-neutral-200">
                              {promo.promotion_name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-neutral-700 text-slate-600 dark:text-neutral-300 font-semibold">
                              {getPromoTypeLabel(promo.promotion_type)}
                            </span>
                          </div>
                          {promo.discount_value > 0 && (
                            <span className="font-black text-rose-600 dark:text-rose-400">
                              -{promo.discount_value.toLocaleString()} ฿
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* สรุปยอดเงิน */}
                {selectedOrder.payment ? (
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
                        <span className={`text-xl sm:text-2xl font-black ${isVoided ? 'line-through text-slate-400 dark:text-neutral-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
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
                            <span className={`font-black ${isVoided ? 'line-through text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              +{selectedOrder.payment.points_earned} แต้ม
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* Modal Footer / Actions */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-neutral-900 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
            {isVoided ? (
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>บิลนี้ถูกยกเลิกแล้ว (Voided)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowVoidModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer border border-rose-200 dark:border-rose-900/50 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยกเลิกบิลนี้ (Void Bill)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded-xl transition cursor-pointer ml-auto"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>

      {/* Void Bill Confirmation & Step-up PIN Modal */}
      {showVoidModal && (
        <VoidBillModal
          order={selectedOrder}
          onClose={() => setShowVoidModal(false)}
          onSuccess={() => {
            setShowVoidModal(false);
            setSelectedOrder(null);
            onOrderVoided?.();
          }}
        />
      )}
    </>,
    document.body
  );
};
