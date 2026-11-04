'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'react-qr-code';
import {
  QrCode,
  X,
  ExternalLink,
  Printer,
  Copy,
  Check,
  Download,
  FileCode,
} from 'lucide-react';

interface StaticMenuQRModalProps {
  onClose: () => void;
}

function StaticMenuQRModalContent({ onClose }: StaticMenuQRModalProps) {
  const [menuUrl, setMenuUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  /**
   * ดาวน์โหลดรูป QR ความละเอียดสูง 2048 x 2048 px (300 DPI)
   * เหมาะสำหรับนำไปพิมพ์ใส่กระดาษ ป้ายโต๊ะ หรือใส่ในโปรแกรมออกแบบ
   */
  const handleDownloadPNG = () => {
    const svgElement = document.getElementById('static-menu-qr')?.querySelector('svg');
    if (!svgElement) return;

    setIsDownloading(true);

    try {
      const targetSize = 2048; // 2048x2048 Ultra-HD (คมชัด 300 DPI สำหรับพิมพ์)
      const padding = 160; // พื้นที่ขอบขาวป้องกันเครื่องพิมพ์ตัดตก (Quiet Zone)

      // Clone SVG และตั้งค่า viewBox ชัดเจน
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      svgClone.setAttribute('width', `${targetSize}`);
      svgClone.setAttribute('height', `${targetSize}`);

      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsDownloading(false);
          return;
        }

        // พื้นหลังขาวบริสุทธิ์ (จำเป็นมากสำหรับการพิมพ์)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetSize, targetSize);

        // วาด QR Code ตรงกลางด้วยความคมชัดสูงสุด
        const qrSize = targetSize - padding * 2;
        ctx.imageSmoothingEnabled = false; // รักษามุมสี่เหลี่ยมคมชัด ไม่เบลอ
        ctx.drawImage(image, padding, padding, qrSize, qrSize);

        URL.revokeObjectURL(blobURL);

        // แปลงเป็น PNG คุณภาพสูงสุด 100%
        const pngUrl = canvas.toDataURL('image/png', 1.0);
        const downloadLink = document.createElement('a');
        downloadLink.download = 'yo-yaki-menu-qr-2048px.png';
        downloadLink.href = pngUrl;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        setIsDownloading(false);
      };

      image.onerror = () => {
        setIsDownloading(false);
      };

      image.src = blobURL;
    } catch (err) {
      console.error('Error downloading QR PNG:', err);
      setIsDownloading(false);
    }
  };

  /**
   * ดาวน์โหลดไฟล์ Vector SVG (ความละเอียดไม่จำกัด ย่อขยายไม่แตกเลย)
   * สำหรับส่งให้ร้านป้ายหรือโรงพิมพ์มืออาชีพ
   */
  const handleDownloadSVG = () => {
    const svgElement = document.getElementById('static-menu-qr')?.querySelector('svg');
    if (!svgElement) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const downloadLink = document.createElement('a');
      downloadLink.download = 'yo-yaki-menu-qr.svg';
      downloadLink.href = blobURL;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobURL);
    } catch (err) {
      console.error('Error downloading QR SVG:', err);
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
        <div className="flex flex-col items-center px-6 py-6 gap-4">
          <div
            id="static-menu-qr"
            className="p-4 bg-white rounded-2xl shadow-inner border border-zinc-100"
          >
            {menuUrl && (
              <QRCode
                value={menuUrl}
                size={180}
                level="Q"
                bgColor="#ffffff"
                fgColor="#111111"
              />
            )}
          </div>

          {/* Info */}
          <div className="text-center space-y-0.5">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">สแกนเพื่อดูเมนูอาหาร</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              ความละเอียดสูงพิเศษ 2048 x 2048 px คมชัดสำหรับพิมพ์
            </p>
          </div>

          {/* URL */}
          <div className="w-full flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2 border border-zinc-200 dark:border-zinc-700">
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
          <div className="w-full flex flex-col gap-2 pt-1">
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPNG}
                disabled={isDownloading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md shadow-red-600/20"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>{isDownloading ? 'กำลังสร้างรูป...' : 'บันทึกรูป QR (HD)'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>พิมพ์ QR</span>
              </button>
            </div>

            <div className="flex items-center justify-between px-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleDownloadSVG}
                className="text-xs font-semibold text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                title="ดาวน์โหลดไฟล์เวกเตอร์ SVG สำหรับร้านป้าย / โรงพิมพ์"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>บันทึกไฟล์เวกเตอร์ (SVG)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
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
