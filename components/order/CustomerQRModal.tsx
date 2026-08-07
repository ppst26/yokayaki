"use client";

import React from 'react';
import { X, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';

interface CustomerQRModalProps {
  showQrModal: boolean;
  setShowQrModal: (val: boolean) => void;
  tableId: number;
  qrSessionId: string | null;
}

export const CustomerQRModal: React.FC<CustomerQRModalProps> = ({
  showQrModal,
  setShowQrModal,
  tableId,
  qrSessionId,
}) => {
  if (!showQrModal || !qrSessionId) return null;

  const customerOrderUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/customer/${qrSessionId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl relative text-center space-y-4">
        <button
          onClick={() => setShowQrModal(false)}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 dark:text-neutral-100 flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-red-600 dark:text-red-400" />
            QR สั่งอาหารสำหรับลูกค้า
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold">
            โต๊ะ {tableId} • รหัสเซสชัน: {qrSessionId.slice(0, 8)}...
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl inline-block">
          <QRCode value={customerOrderUrl} size={180} level="H" />
        </div>

        <p className="text-[11px] text-slate-400 dark:text-neutral-500 font-semibold">
          ให้ลูกค้านำมือถือสแกน QR Code นี้เพื่อเริ่มเลือกและสั่งอาหารได้ด้วยตนเอง
        </p>
      </div>
    </div>
  );
};
