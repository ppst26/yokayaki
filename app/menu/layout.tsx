/**
 * Layout สำหรับ /menu — Public page ไม่ต้อง Auth
 * Override root layout's AuthProvider ไม่ได้ แต่ AuthProvider สามารถ render ได้โดยไม่ต้อง login
 * Layout นี้แค่ให้ metadata viewport ที่ถูกต้อง (mobile-first, allow scale)
 */
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'เมนูอาหาร | Yo-Yaki Izakaya',
  description: 'รายการอาหารและเครื่องดื่ม Yo-Yaki Izakaya — Japanese BBQ & Sushi Bar',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // อนุญาต pinch-to-zoom ในหน้าเมนูสำหรับลูกค้า
  maximumScale: 5,
  userScalable: true,
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

