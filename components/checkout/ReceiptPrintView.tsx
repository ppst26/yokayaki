"use client";

import React from 'react';
import { Printer } from 'lucide-react';
import { PLATFORM_BRANDING } from '@/lib/branding';

interface OrderedItem {
  id: number;
  quantity: number;
  unit_price: number;
  status: string;
  notes?: string;
  created_at: string;
  menu_items: { id: number; name: string };
}

interface Promotion {
  id: number;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_amount?: number;
  discount_percent?: number;
  coupon_code?: string;
}

interface FreeItemDetail {
  name: string;
  qty: number;
}

interface AppliedPromo {
  promo: Promotion;
  discountValue: number;
  freeItems?: FreeItemDetail[];
}

interface LoyaltyMember {
  phone_number: string;
  name: string;
  points: number;
}

interface ReceiptPrintViewProps {
  orderId: number | null;
  tableId: string;
  tableNumber?: number;
  now: Date;
  employeeName?: string;
  activeItems: OrderedItem[];
  subtotal: number;
  appliedPromos: AppliedPromo[];
  loyaltyDiscount: number;
  netAmount: number;
  cashNum: number;
  transferAmount: number;
  changeAmount: number;
  member: LoyaltyMember | null;
  pointsToRedeem: number;
  pointsEarned: number;
  onBack: () => void;
}

export const ReceiptPrintView: React.FC<ReceiptPrintViewProps> = ({
  orderId,
  tableId,
  tableNumber,
  now,
  employeeName,
  activeItems,
  subtotal,
  appliedPromos,
  loyaltyDiscount,
  netAmount,
  cashNum,
  transferAmount,
  changeAmount,
  member,
  pointsToRedeem,
  pointsEarned,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-neutral-950 text-slate-800 dark:text-neutral-200 flex flex-col items-center justify-center p-6 print:min-h-0 print:bg-white print:p-0 print:block">
      {/* #receipt — กว้าง 48mm (4.80cm) ตอนพิมพ์; หัวใบเสร็จใช้โลโก้แทนชื่อร้าน */}
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
          <p>บิลเลขที่: ORD-{orderId}</p>
          <p>โต๊ะที่: Table {tableNumber ?? tableId}</p>
          <p>
            วันที่: {now.toLocaleDateString('th-TH')} เวลา:{' '}
            {now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
          </p>
          <p>พนักงาน: {employeeName}</p>
        </div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        {activeItems.map(item => (
          <div key={item.id} className="receipt-item py-0.5">
            <div className="flex justify-between gap-2 text-[13px] font-semibold">
              <span className="min-w-0 break-words">
                - {item.menu_items?.name} x{item.quantity}
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
        <div className="border-t border-dashed border-gray-400 my-2" />
        <div className="receipt-row flex justify-between text-[13px] font-semibold">
          <span>ยอดรวม:</span>
          <span className="tabular-nums">{subtotal.toLocaleString()} บาท</span>
        </div>
        {appliedPromos.map(ap => (
          <div key={ap.promo.id} className="text-red-600">
            <div className="receipt-row flex justify-between gap-2 text-[13px] font-semibold">
              <span className="min-w-0 break-words">โปรโม: {ap.promo.name}</span>
              <span className="shrink-0 tabular-nums">-{ap.discountValue.toLocaleString()} บาท</span>
            </div>
            {ap.freeItems &&
              ap.freeItems.map((fi, idx) => (
                <div key={idx} className="receipt-note pl-3 text-[12px] text-gray-500">
                  └ ฟรี: {fi.name} x{fi.qty}
                </div>
              ))}
          </div>
        ))}
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
        {cashNum > 0 && (
          <p className="receipt-pay text-[13px] font-semibold">
            {' '}
            * เงินสด: {cashNum.toLocaleString()} บาท
          </p>
        )}
        {transferAmount > 0 && cashNum < netAmount && (
          <p className="receipt-pay text-[13px] font-semibold">
            {' '}
            * โอนพร้อมเพย์: {transferAmount.toLocaleString()} บาท
          </p>
        )}
        {changeAmount > 0 && (
          <p className="receipt-pay text-[13px] font-semibold">
            {' '}
            * เงินทอน: {changeAmount.toLocaleString()} บาท
          </p>
        )}
        {member && (
          <>
            <div className="border-t border-dashed border-gray-400 my-2" />
            <p className="receipt-pay text-[13px] font-semibold">
              สมาชิก: {member.name} ({member.phone_number})
            </p>
            {pointsToRedeem > 0 && (
              <p className="receipt-pay text-[13px] font-semibold">
                แต้มที่ใช้: {pointsToRedeem} แต้ม
              </p>
            )}
            <p className="receipt-pay text-[13px] font-semibold">
              แต้มสะสมรอบนี้: +{pointsEarned} แต้ม
            </p>
          </>
        )}
        <div className="border-t border-dashed border-gray-400 my-2" />
        <p className="receipt-footer text-center text-[12px] font-semibold text-gray-500">
          ขอบคุณที่ใช้บริการค่ะ!
        </p>
      </div>

      {/* Action Buttons (hidden in print) */}
      <div className="mt-6 flex gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="btn-crimson flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition active:scale-95"
        >
          <Printer className="h-4 w-4" />
          พิมพ์ใบเสร็จ
        </button>
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          กลับหน้าผังโต๊ะ
        </button>
      </div>
    </div>
  );
};
