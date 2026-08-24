import React from 'react';
import { Banknote, CreditCard, Receipt, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface PaymentCardProps {
  cashReceived: string;
  setCashReceived: React.Dispatch<React.SetStateAction<string>>;
  cashNum: number;
  changeAmount: number;
  transferAmount: number;
  netAmount: number;
  pendingItemsCount: number;
  setShowQrModal: (val: boolean) => void;
  /** ตั้งค่า NEXT_PUBLIC_PROMPTPAY_ID ไว้ถูกต้องหรือยัง (A7.8) */
  promptPayReady: boolean;
  processPayment: () => void;
  isProcessing: boolean;
}

export const PaymentCard: React.FC<PaymentCardProps> = ({
  cashReceived,
  setCashReceived,
  cashNum,
  changeAmount,
  transferAmount,
  netAmount,
  pendingItemsCount,
  setShowQrModal,
  promptPayReady,
  processPayment,
  isProcessing,
}) => {
  return (
    <Card className="fixed lg:relative bottom-0 left-0 right-0 z-40 lg:z-auto w-full rounded-t-3xl lg:rounded-2xl rounded-b-none lg:rounded-b-2xl border-t lg:border border-slate-200 dark:border-neutral-800 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] lg:shadow-xs p-4 sm:p-5 bg-white dark:bg-neutral-900 space-y-3 sm:space-y-4 transition-all">
      {/* Cash Input */}
      <div>
        <h3 className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-400 mb-2 flex items-center gap-2">
          <Banknote className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
          เงินสดรับ
        </h3>
        <input
          type="number"
          min={0}
          step={1}
          placeholder="0"
          value={cashReceived}
          onChange={e => setCashReceived(e.target.value)}
          className="w-full bg-slate-50 dark:bg-neutral-800 rounded-xl px-4 py-2.5 text-2xl font-black text-slate-900 dark:text-neutral-100 text-right focus:outline-none transition"
        />

        <div className="flex gap-2 mt-2">
          {[100, 500, 1000].map(amt => (
            <button
              key={amt}
              onClick={() => setCashReceived(prev => String((parseFloat(prev) || 0) + amt))}
              className="flex-1 py-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg text-sm font-bold text-slate-700 dark:text-neutral-200 transition active:scale-95 cursor-pointer border-none"
            >
              +{amt}
            </button>
          ))}
          <button
            onClick={() => setCashReceived(String(netAmount))}
            className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg text-sm font-bold text-emerald-700 dark:text-emerald-300 transition active:scale-95 cursor-pointer border-none"
          >
            เต็มจำนวน
          </button>
          {cashNum > 0 && (
            <button
              onClick={() => setCashReceived('')}
              className="px-2.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg text-sm font-bold text-rose-600 dark:text-rose-400 transition active:scale-95 cursor-pointer border-none"
              title="ล้างยอดเงินสด"
            >
              ล้าง
            </button>
          )}
        </div>

        {/* Change calculation */}
        {cashNum > 0 && changeAmount > 0 && (
          <div className="mt-3 py-2 flex justify-between items-center">
            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">
              เงินทอน
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-black text-lg">
              {changeAmount.toLocaleString()} บาท
            </span>
          </div>
        )}

        {/* Transfer remaining */}
        {cashNum > 0 && cashNum < netAmount && (
          <div className="mt-3 py-2 flex justify-between items-center">
            <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">
              ยอดค้างชำระ (โอน)
            </span>
            <span className="text-blue-600 dark:text-blue-400 font-black text-lg">
              {transferAmount.toLocaleString()} บาท
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-neutral-800">
        {/* Generate PromptPay QR */}
        {cashNum < netAmount && netAmount > 0 && !promptPayReady && (
          <div className="w-full py-3 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              ยังไม่ได้ตั้งค่าพร้อมเพย์ของร้าน — รับได้เฉพาะเงินสด
              <br />
              <span className="font-semibold opacity-80">
                ตั้งค่า NEXT_PUBLIC_PROMPTPAY_ID (เบอร์ 10 หลัก หรือเลขประจำตัวผู้เสียภาษี 13 หลัก) แล้ว deploy ใหม่
              </span>
            </span>
          </div>
        )}

        {cashNum < netAmount && netAmount > 0 && promptPayReady && (
          <button
            onClick={() => setShowQrModal(true)}
            disabled={pendingItemsCount > 0}
            className="w-full py-3 bg-slate-800 dark:bg-neutral-800 hover:bg-slate-900 dark:hover:bg-neutral-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition active:scale-98 flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed border-none"
          >
            <CreditCard className="w-4.5 h-4.5" />
            สร้าง QR พร้อมเพย์ ({transferAmount.toLocaleString()} บาท)
          </button>
        )}

        {/* Confirm Payment */}
        <button
          onClick={processPayment}
          disabled={isProcessing || netAmount <= 0 || pendingItemsCount > 0}
          className={`w-full py-3.5 rounded-xl font-extrabold text-base transition active:scale-98 flex items-center justify-center gap-2 shadow-md ${
            pendingItemsCount > 0
              ? 'bg-slate-300 dark:bg-neutral-800 text-slate-500 dark:text-neutral-500 cursor-not-allowed shadow-none'
              : 'bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-neutral-800 text-white shadow-red-600/20 cursor-pointer border-none'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              กำลังบันทึก...
            </>
          ) : pendingItemsCount > 0 ? (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>ยังชำระเงินไม่ได้ (ค้างครัว {pendingItemsCount} รายการ)</span>
            </>
          ) : (
            <>
              <Receipt className="w-5 h-5" />
              <span>ยืนยันรับชำระเงิน ({netAmount.toLocaleString()} บาท)</span>
            </>
          )}
        </button>
      </div>
    </Card>
  );
};
