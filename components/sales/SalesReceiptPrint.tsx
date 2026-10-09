"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { PLATFORM_BRANDING } from '@/lib/branding';

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

interface OrderItemForReceipt {
  id: number;
  quantity: number;
  unit_price: number;
  notes: string | null;
  menu_items: { name: string } | null;
}

interface SalesReceiptPrintProps {
  order: CompletedOrder;
  onClose: () => void;
}

/**
 * ใบเสร็จจากประวัติการขาย — ใช้ layout เดียวกับ ReceiptPrintView (checkout)
 * เรียก window.print() → thermal 48mm ผ่าน CSS `#receipt`
 */
export const SalesReceiptPrint: React.FC<SalesReceiptPrintProps> = ({ order, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<OrderItemForReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch order items for this specific order
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('order_items')
          .select('id, quantity, unit_price, notes, menu_items(name)')
          .eq('order_id', order.id)
          .neq('status', 'voided')
          .order('id', { ascending: true });

        if (error) throw error;
        setItems((data || []) as unknown as OrderItemForReceipt[]);
      } catch (err) {
        console.error('Error fetching items for receipt:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchItems();
  }, [order.id]);

  // Lock body scroll and handle ESC
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!mounted) return null;

  const pmt = order.payment;
  const billDate = new Date(pmt?.created_at || order.created_at);
  const subtotal = pmt?.subtotal ?? items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const netAmount = pmt?.net_amount ?? subtotal;
  const cashAmount = pmt?.cash_amount ?? 0;
  const promptpayAmount = pmt?.promptpay_amount ?? 0;
  const changeAmount = cashAmount > netAmount ? cashAmount - netAmount : 0;
  const promoDiscount = order.promos.reduce((s, p) => s + p.discount_value, 0);
  const loyaltyDiscount = pmt?.points_redeemed ?? 0;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 md:p-6 app-dialog-backdrop animate-backdrop-in print:bg-transparent print:p-0"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center print:block print:w-full"
      >
        {/* #receipt — reuse existing print CSS rules for thermal 48mm */}
        <div
          id="receipt"
          className="bg-white text-black w-[280px] p-5 rounded-2xl shadow-xl border border-slate-200 font-sans text-sm font-semibold print:shadow-none print:rounded-none print:w-[48mm] print:max-w-[48mm] print:border-none print:p-0"
        >
          <div className="mb-3 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- thermal print ต้องเป็น <img> ธรรมดา */}
            <img
              src={PLATFORM_BRANDING.receiptLogo}
              alt="Yoyaki"
              className="receipt-logo h-auto w-[160px] max-w-[85%] object-contain"
            />
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="receipt-meta space-y-0.5 text-[13px] font-semibold">
            <p>บิลเลขที่: ORD-{order.id}</p>
            <p>โต๊ะที่: Table {order.table_number ?? order.table_id}</p>
            <p>
              วันที่: {billDate.toLocaleDateString('th-TH')} เวลา:{' '}
              {billDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
            </p>
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {items.map(item => (
                <div key={item.id} className="receipt-item py-0.5">
                  <div className="flex justify-between gap-2 text-[13px] font-semibold">
                    <span className="min-w-0 break-words">
                      - {item.menu_items?.name ?? 'ไม่ทราบชื่อ'} x{item.quantity}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {(item.quantity * item.unit_price).toLocaleString()}
                    </span>
                  </div>
                  {item.notes && (
                    <div className="receipt-note pl-3 text-[12px] text-gray-500">*{item.notes}</div>
                  )}
                </div>
              ))}
            </>
          )}

          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="receipt-row flex justify-between text-[13px] font-semibold">
            <span>ยอดรวม:</span>
            <span className="tabular-nums">{subtotal.toLocaleString()} บาท</span>
          </div>

          {/* โปรโมชั่น */}
          {order.promos.map(promo => (
            <div key={promo.id} className="text-red-600">
              <div className="receipt-row flex justify-between gap-2 text-[13px] font-semibold">
                <span className="min-w-0 break-words">โปรโม: {promo.promotion_name}</span>
                <span className="shrink-0 tabular-nums">
                  -{promo.discount_value.toLocaleString()} บาท
                </span>
              </div>
              {promo.free_items &&
                promo.free_items.map((fi, idx) => (
                  <div key={idx} className="receipt-note pl-3 text-[12px] text-gray-500">
                    └ ฟรี: {fi.name} x{fi.qty}
                  </div>
                ))}
            </div>
          ))}

          {/* ส่วนลดแต้ม */}
          {loyaltyDiscount > 0 && (
            <div className="receipt-row flex justify-between text-[13px] font-semibold text-red-600">
              <span>ส่วนลดแต้ม:</span>
              <span className="tabular-nums">-{loyaltyDiscount.toLocaleString()} บาท</span>
            </div>
          )}

          <div className="receipt-total mt-1 flex justify-between text-base font-black">
            <span>รวมทั้งสิ้น:</span>
            <span className="tabular-nums">{netAmount.toLocaleString()} บาท</span>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />
          <p className="receipt-pay text-[13px] font-semibold">ชำระโดย:</p>
          {cashAmount > 0 && (
            <p className="receipt-pay text-[13px] font-semibold">
              {' '}* เงินสด: {cashAmount.toLocaleString()} บาท
            </p>
          )}
          {promptpayAmount > 0 && (
            <p className="receipt-pay text-[13px] font-semibold">
              {' '}* โอนพร้อมเพย์: {promptpayAmount.toLocaleString()} บาท
            </p>
          )}
          {changeAmount > 0 && (
            <p className="receipt-pay text-[13px] font-semibold">
              {' '}* เงินทอน: {changeAmount.toLocaleString()} บาท
            </p>
          )}

          {/* สมาชิก CRM */}
          {pmt && (pmt.member_name || pmt.phone_number) && (
            <>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p className="receipt-pay text-[13px] font-semibold">
                สมาชิก: {pmt.member_name ?? pmt.phone_number}
                {pmt.member_name && pmt.phone_number ? ` (${pmt.phone_number})` : ''}
              </p>
              {pmt.points_redeemed > 0 && (
                <p className="receipt-pay text-[13px] font-semibold">
                  แต้มที่ใช้: {pmt.points_redeemed} แต้ม
                </p>
              )}
              {pmt.points_earned > 0 && (
                <p className="receipt-pay text-[13px] font-semibold">
                  แต้มสะสมรอบนี้: +{pmt.points_earned} แต้ม
                </p>
              )}
            </>
          )}

          <div className="border-t border-dashed border-gray-400 my-2" />
          <p className="receipt-footer text-center text-[12px] font-semibold text-gray-500">
            ขอบคุณที่ใช้บริการค่ะ!
          </p>
          <p className="receipt-footer text-center text-[11px] font-medium text-gray-400 mt-0.5">
            (พิมพ์ซ้ำจากประวัติการขาย)
          </p>
        </div>

        {/* Action Buttons (hidden in print) */}
        <div className="mt-6 flex gap-3 print:hidden">
          <button
            onClick={handlePrint}
            disabled={loading}
            className="btn-crimson flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
          >
            พิมพ์ใบเสร็จ
          </button>
          <button
            onClick={onClose}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
