"use client";

import React, { useCallback, useEffect } from 'react';
import { X, QrCode, Printer } from 'lucide-react';
import QRCode from 'react-qr-code';

interface CustomerQRModalProps {
  showQrModal: boolean;
  setShowQrModal: (val: boolean) => void;
  tableId: string;
  tableNumber?: number;
  qrSessionId: string | null;
}

const PRINT_CLASS = 'print-customer-qr';

export const CustomerQRModal: React.FC<CustomerQRModalProps> = ({
  showQrModal,
  setShowQrModal,
  tableId,
  tableNumber,
  qrSessionId,
}) => {
  const tableLabel = tableNumber ?? tableId;

  const cleanupPrintClass = useCallback(() => {
    document.documentElement.classList.remove(PRINT_CLASS);
  }, []);

  useEffect(() => {
    window.addEventListener('afterprint', cleanupPrintClass);
    return () => {
      window.removeEventListener('afterprint', cleanupPrintClass);
      cleanupPrintClass();
    };
  }, [cleanupPrintClass]);

  if (!showQrModal || !qrSessionId) return null;

  const customerOrderUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/customer/${qrSessionId}`;

  const handlePrint = () => {
    document.documentElement.classList.add(PRINT_CLASS);
    // ให้ browser วาด class ก่อนเปิด dialog พิมพ์
    requestAnimationFrame(() => {
      window.print();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 app-dialog-backdrop">
      {/* โซนพิมพ์ — นอกจอบนหน้าจอ โชว์ตอน print */}
      <div
        id="customer-qr-print"
        className="pointer-events-none absolute left-[-9999px] top-0 w-[48mm] bg-white text-black"
        aria-hidden="true"
      >
        <p className="customer-qr-print-title">โต๊ะ {tableLabel}</p>
        <p className="customer-qr-print-sub">สแกนเพื่อสั่งอาหาร</p>
        <div className="customer-qr-print-code">
          <QRCode value={customerOrderUrl} size={256} level="M" />
        </div>
        <p className="customer-qr-print-hint">สแกนด้วยกล้องมือถือ</p>
      </div>

      <div className="app-dialog relative flex w-full max-w-[280px] flex-col items-stretch overflow-hidden p-4 pt-5 shadow-xl sm:max-w-[300px]">
        <button
          type="button"
          onClick={() => setShowQrModal(false)}
          className="absolute top-3 right-3 rounded-full p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 cursor-pointer"
          aria-label="ปิด"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-1 px-1 text-center">
          <h3 className="flex items-center justify-center gap-1.5 text-base font-black text-slate-900 dark:text-neutral-100">
            <QrCode className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            QR สั่งอาหาร
          </h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
            โต๊ะ {tableLabel}
          </p>
        </div>

        {/* QR เต็มความกว้าง — padding แนวนอนเล็กน้อย */}
        <div className="mt-4 w-full px-1.5">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-2 dark:border-neutral-700">
            <QRCode
              value={customerOrderUrl}
              size={256}
              level="H"
              style={{ height: 'auto', width: '100%', maxWidth: '100%' }}
              viewBox="0 0 256 256"
              className="h-auto w-full"
            />
          </div>
        </div>

        <p className="mt-3 px-1 text-center text-[11px] font-semibold leading-snug text-slate-400 dark:text-neutral-500">
          ให้ลูกค้าสแกน QR เพื่อสั่งอาหารด้วยตนเอง
        </p>

        <button
          type="button"
          onClick={handlePrint}
          className="btn-crimson mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
        >
          <Printer className="h-4 w-4" />
          พิมพ์ QR Code
        </button>
      </div>
    </div>
  );
};
