"use client";

import { useEffect, type ReactNode } from 'react';

/** หน้าลูกค้า QR ใช้ dark เสมอ — ไม่ตามธีมเครื่อง POS */
export default function CustomerLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return children;
}
