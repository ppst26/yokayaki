'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'react-qr-code';
import { QrCode, X, ExternalLink, Printer, Copy, Check } from 'lucide-react';

interface StaticMenuQRModalProps {
  onClose: () => void;
}

function StaticMenuQRModalContent({ onClose }: StaticMenuQRModalProps) {
  const [menuUrl, setMenuUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMenuUrl(`${window.location.origin}/menu`);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>QR เมนูอาหาร — Yo-Yaki Izakaya</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Noto Sans Thai', sans-serif;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
          }
          .card {
            text-align: center;
            border: 2px solid #111;
            border-radius: 20px;
            padding: 32px 24px;
            max-width: 320px;
            width: 100%;
          }
          .logo { font-size: 22px; font-weight: 900; letter-spacing: 0.08em; margin-bottom: 4px; }
          .sub { font-size: 13px; color: #b91c1c; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 24px; }
          .qr { margin: 0 auto 20px; display: block; }
          .label { font-size: 15px; font-weight: 800; margin-bottom: 6px; }
          .url { font-size: 11px; color: #666; word-break: break-all; }
          .footer { margin-top: 20px; font-size: 10px; color: #888; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">YO-YAKI IZAKAYA</div>
          <div class="sub">รายการอาหาร</div>
          <svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="200" height="200">
            ${document.getElementById('static-menu-qr')?.querySelector('svg')?.innerHTML ?? ''}
          </svg>
          <div class="label">สแกนเพื่อดูเมนูอาหาร</div>
          <div class="url">${menuUrl}</div>
          <div class="footer">สแกนเปิดดูรายการอาหารและราคาได้ทันที</div>
        </div>
        <script>window.onload = () => window.print();<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
              <QrCode className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">QR เมนูอาหาร</h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">สำหรับแปะโต๊ะให้ลูกค้าสแกนดูเมนู</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center px-6 py-6 gap-5">
          <div
            id="static-menu-qr"
            className="p-4 bg-white rounded-2xl shadow-inner border border-zinc-100"
          >
            {menuUrl && (
              <QRCode
                value={menuUrl}
                size={180}
                level="M"
                bgColor="#ffffff"
                fgColor="#111111"
              />
            )}
          </div>

          {/* Info */}
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">สแกนเพื่อดูเมนูอาหาร</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              ลูกค้าดูรายการอาหารและราคาได้เลย ไม่ต้องล็อกอิน
            </p>
          </div>

          {/* URL */}
          <div className="w-full flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2.5 border border-zinc-200 dark:border-zinc-700">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex-1 font-mono">
              {menuUrl}
            </span>
            <button
              onClick={handleCopy}
              title="คัดลอก URL"
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <a
              href={menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="เปิดในแท็บใหม่"
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Actions */}
          <div className="w-full flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors active:scale-95 cursor-pointer shadow-md shadow-red-600/20"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ QR
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-bold transition-colors cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * StaticMenuQRModal — เปิด QR Code สำหรับ /menu (Static, ไม่ต้องผูก session)
 * ใช้ Portal เพื่อ render นอก sidebar hierarchy
 */
export function StaticMenuQRModal({ onClose }: StaticMenuQRModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(<StaticMenuQRModalContent onClose={onClose} />, document.body);
}

/**
 * StaticMenuQRButton — ปุ่มเปิด QR Modal (ใส่ใน SidebarNav)
 * แสดงเฉพาะ owner / role ที่มีสิทธิ์ menu
 */
export function StaticMenuQRButton({ isDrawer = false }: { isDrawer?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="QR เมนูอาหาร"
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:outline-none select-none text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 ${
          isDrawer ? '' : 'sidebar-nav-btn'
        }`}
      >
        <QrCode className="w-4.5 h-4.5 shrink-0" />
        <span className={isDrawer ? '' : 'sidebar-nav-label'}>QR เมนูอาหาร</span>
      </button>
      {open && <StaticMenuQRModal onClose={() => setOpen(false)} />}
    </>
  );
}
