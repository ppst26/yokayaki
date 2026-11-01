"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, X, AlertTriangle, Delete, CircleX, Loader2 } from 'lucide-react';
import { VOID_REASONS, VOID_REASON_OTHER, type VoidReason } from '@/lib/voidReasons';

interface CompletedOrder {
  id: number;
  table_id: string;
  table_number?: number;
  payment: {
    net_amount: number;
    subtotal: number;
  } | null;
}

interface VoidBillModalProps {
  order: CompletedOrder;
  onClose: () => void;
  onSuccess: () => void;
}

// รายการเหตุผลที่เหมาะสมสำหรับยกเลิกบิล
const BILL_VOID_REASONS: VoidReason[] = VOID_REASONS.filter(r =>
  ['wrong_bill', 'customer_cancel', 'wrong_key', 'cooking_error', 'other'].includes(r.code)
);

export const VoidBillModal: React.FC<VoidBillModalProps> = ({
  order,
  onClose,
  onSuccess,
}) => {
  const [mounted, setMounted] = useState(false);
  const [reasonCode, setReasonCode] = useState<string>('wrong_bill');
  const [reasonNote, setReasonNote] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC and keyboard number input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (/^[0-9]$/.test(e.key) && pin.length < 6 && !isSubmitting) {
        setPin(prev => (prev.length < 6 ? prev + e.key : prev));
      } else if (e.key === 'Backspace' && !isSubmitting) {
        setPin(prev => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isSubmitting, onClose]);

  const handleNumberClick = (digit: string) => {
    if (isSubmitting || pin.length >= 6) return;
    setPin(prev => prev + digit);
  };

  const handleBackspace = () => {
    if (isSubmitting) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isSubmitting) return;
    setPin('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setErrorMsg('กรุณากรอก PIN 6 หลักเพื่อยืนยัน');
      return;
    }
    if (reasonCode === VOID_REASON_OTHER && !reasonNote.trim()) {
      setErrorMsg('กรุณาระบุรายละเอียดเหตุผลการยกเลิกบิล');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch('/api/sales/void-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          pin,
          reasonCode,
          reasonNote: reasonNote.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถยกเลิกบิลได้');
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการยกเลิกบิล';
      setErrorMsg(msg);
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  const totalAmount = order.payment?.net_amount ?? order.payment?.subtotal ?? 0;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 app-dialog-backdrop animate-backdrop-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="app-dialog w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-base sm:text-lg font-black tracking-tight">
              ยกเลิกบิล (Void Bill)
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Summary Banner */}
        <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl space-y-1.5">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-neutral-300">
            <span>บิล ORD-{order.id} (โต๊ะ {order.table_number ?? order.table_id})</span>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400">
              {Number(totalAmount).toLocaleString()} ฿
            </span>
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-300 leading-relaxed flex items-start gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              ระบบจะคืนสต็อกสินค้าและดึงแต้มสมาชิกคืนโดยอัตโนมัติ บิลนี้จะไม่ถูกนำไปคำนวณในยอดขาย
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
              เหตุผลในการยกเลิกบิล:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {BILL_VOID_REASONS.map(r => (
                <button
                  key={r.code}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setReasonCode(r.code)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border text-left transition ${
                    reasonCode === r.code
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-700 hover:border-slate-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {reasonCode === VOID_REASON_OTHER && (
              <input
                type="text"
                disabled={isSubmitting}
                placeholder="ระบุเหตุผลในการยกเลิกบิล..."
                value={reasonNote}
                onChange={e => setReasonNote(e.target.value)}
                className="w-full mt-2 px-3 py-2 text-xs font-medium border border-slate-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                maxLength={255}
                required
              />
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-xl text-xs font-bold text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {/* PIN Verification Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
            <div className="text-center">
              <label className="block text-xs font-black text-slate-900 dark:text-neutral-100">
                ใส่รหัส PIN ของเจ้าของร้าน หรือ ผู้จัดการ (Step-up PIN)
              </label>
              <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                เพื่ออนุมัติการยกเลิกบิลในระบบ
              </p>
            </div>

            {/* PIN Dots */}
            <div className="flex justify-center items-center gap-2.5 py-1">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    pin.length > i
                      ? 'bg-rose-600 border-rose-600 scale-110'
                      : 'border-slate-300 dark:border-neutral-700 bg-transparent'
                  }`}
                />
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleNumberClick(num)}
                  className="h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 active:scale-95 text-slate-900 dark:text-neutral-100 font-bold text-base transition flex items-center justify-center cursor-pointer"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleClear}
                aria-label="ล้าง PIN"
                className="h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 active:scale-95 text-slate-500 font-bold text-xs transition flex items-center justify-center cursor-pointer"
              >
                <CircleX className="w-5 h-5 text-slate-400" />
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleNumberClick('0')}
                className="h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 active:scale-95 text-slate-900 dark:text-neutral-100 font-bold text-base transition flex items-center justify-center cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleBackspace}
                aria-label="ลบตัวเลข"
                className="h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 active:scale-95 text-slate-500 font-bold text-xs transition flex items-center justify-center cursor-pointer"
              >
                <Delete className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 text-xs font-bold text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || pin.length !== 6}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังยกเลิกบิล...
                </>
              ) : (
                'ยืนยันยกเลิกบิล'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

