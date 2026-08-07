"use client";

import React from 'react';
import { X } from 'lucide-react';
import QRCode from 'react-qr-code';

interface PromptPayQRModalProps {
  showQrModal: boolean;
  setShowQrModal: (val: boolean) => void;
  transferAmount: number;
  promptPayId: string;
  generatePromptPayQR: (id: string, amount: number) => string;
}

export const PromptPayQRModal: React.FC<PromptPayQRModalProps> = ({
  showQrModal,
  setShowQrModal,
  transferAmount,
  promptPayId,
  generatePromptPayQR,
}) => {
  if (!showQrModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl w-full max-w-sm p-6 shadow-xl relative text-center">
        <button
          onClick={() => setShowQrModal(false)}
          className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-full text-slate-500 dark:text-neutral-400 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-black text-slate-900 dark:text-neutral-100 mb-1">
          PromptPay QR
        </h3>
        <p className="text-slate-500 dark:text-neutral-400 text-xs mb-5 font-medium">
          สแกนเพื่อชำระเงิน {transferAmount.toLocaleString()} บาท
        </p>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block">
          <QRCode
            value={generatePromptPayQR(promptPayId, transferAmount)}
            size={200}
            level="H"
          />
        </div>
        <p className="text-center text-[10px] text-slate-400 dark:text-neutral-500 mt-4 font-semibold">
          Yokayaki Izakaya • PromptPay
        </p>
      </div>
    </div>
  );
};
