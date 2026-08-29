import 'server-only';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { HttpError } from '@/lib/session';

// =============================================================
// ตรวจ QR session ของลูกค้า — ด่านแรกของทุก route ฝั่งลูกค้า
//
// หน้าลูกค้าไม่มี credential ใดๆ อีกต่อไป: session UUID ใน URL คือสิทธิ์ทั้งหมด
// ที่ลูกค้ามี และมันให้สิทธิ์เฉพาะ "โต๊ะนี้ ระหว่างที่เซสชันยังไม่หมดอายุ" เท่านั้น
// =============================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CustomerSession {
  sessionId: string;
  tableId: number;
}

export async function requireCustomerSession(sessionId: string): Promise<CustomerSession> {
  if (!UUID_RE.test(sessionId)) {
    throw new HttpError(404, 'ไม่พบเซสชันการสั่งอาหาร');
  }

  const { data, error } = await supabaseAdmin
    .from('qr_sessions')
    .select('table_id, status, expired_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.status !== 'active') {
    throw new HttpError(410, 'เซสชันนี้สิ้นสุดแล้ว');
  }
  if (data.expired_at && new Date(data.expired_at) < new Date()) {
    throw new HttpError(410, 'เซสชันนี้หมดอายุแล้ว');
  }

  return { sessionId, tableId: data.table_id };
}
