"use client";

import React from 'react';
import { Printer } from 'lucide-react';

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
  tableId: number;
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
    <div className="min-h-screen bg-gray-100 dark:bg-neutral-950 text-slate-800 dark:text-neutral-200 flex flex-col items-center justify-center p-6">
      {/* Print-only receipt */}
      <div
        id="receipt"
        className="bg-white text-black w-[320px] p-6 rounded-2xl shadow-xl border border-slate-200 font-mono text-xs print:shadow-none print:rounded-none print:w-[80mm] print:border-none"
      >
        <div className="text-center mb-3">
          <h2 className="text-lg font-black tracking-wider">YOKAYAKI IZAKAYA</h2>
          <p className="text-[10px] text-gray-500">(3-4 Tables Setup)</p>
        </div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <div className="text-[11px] space-y-0.5">
          <p>บิลเลขที่: ORD-{orderId}</p>
          <p>โต๊ะที่: Table {tableId}</p>
          <p>
            วันที่: {now.toLocaleDateString('th-TH')} เวลา:{' '}
            {now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
          </p>
          <p>พนักงาน: {employeeName}</p>
        </div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        {activeItems.map(item => (
          <div key={item.id} className="py-0.5">
            <div className="flex justify-between text-[11px]">
              <span>
                - {item.menu_items?.name} x{item.quantity}
              </span>
              <span>{(item.quantity * item.unit_price).toLocaleString()}</span>
            </div>
            {item.notes && (
              <div className="text-[10px] text-gray-500 pl-3">*{item.notes}</div>
            )}
          </div>
        ))}
        <div className="border-t border-dashed border-gray-400 my-2" />
        <div className="flex justify-between text-[11px]">
          <span>ยอดรวม:</span>
          <span>{subtotal.toLocaleString()} บาท</span>
        </div>
        {appliedPromos.map(ap => (
          <div key={ap.promo.id} className="text-red-600">
            <div className="flex justify-between text-[11px]">
              <span>โปรโม: {ap.promo.name}</span>
              <span>-{ap.discountValue.toLocaleString()} บาท</span>
            </div>
            {ap.freeItems &&
              ap.freeItems.map((fi, idx) => (
                <div key={idx} className="text-[10px] pl-3 text-gray-500">
                  └ ฟรี: {fi.name} x{fi.qty}
                </div>
              ))}
          </div>
        ))}
        {loyaltyDiscount > 0 && (
          <div className="flex justify-between text-[11px] text-red-600">
            <span>ส่วนลดแต้ม:</span>
            <span>-{loyaltyDiscount.toLocaleString()} บาท</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm mt-1">
          <span>รวมทั้งสิ้น:</span>
          <span>{netAmount.toLocaleString()} บาท</span>
        </div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <p className="text-[10px]">ชำระโดย:</p>
        {cashNum > 0 && (
          <p className="text-[10px]"> * เงินสด: {cashNum.toLocaleString()} บาท</p>
        )}
        {transferAmount > 0 && cashNum < netAmount && (
          <p className="text-[10px]">
            {' '}
            * โอนพร้อมเพย์: {transferAmount.toLocaleString()} บาท
          </p>
        )}
        {changeAmount > 0 && (
          <p className="text-[10px]">
            {' '}
            * เงินทอน: {changeAmount.toLocaleString()} บาท
          </p>
        )}
        {member && (
          <>
            <div className="border-t border-dashed border-gray-400 my-2" />
            <p className="text-[10px]">
              สมาชิก: {member.name} ({member.phone_number})
            </p>
            {pointsToRedeem > 0 && (
              <p className="text-[10px]">แต้มที่ใช้: {pointsToRedeem} แต้ม</p>
            )}
            <p className="text-[10px]">แต้มสะสมรอบนี้: +{pointsEarned} แต้ม</p>
          </>
        )}
        <div className="border-t border-dashed border-gray-400 my-2" />
        <p className="text-center text-[10px] text-gray-500">
          ขอบคุณที่ใช้บริการค่ะ!
        </p>
      </div>

      {/* Action Buttons (hidden in print) */}
      <div className="flex gap-3 mt-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-700 active:scale-95 transition shadow-sm cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          พิมพ์ใบเสร็จ
        </button>
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 shadow-xs px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-neutral-700 active:scale-95 transition cursor-pointer"
        >
          กลับหน้าผังโต๊ะ
        </button>
      </div>
    </div>
  );
};
