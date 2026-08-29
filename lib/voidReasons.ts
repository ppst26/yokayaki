// =============================================================
// เหตุผลการยกเลิกรายการ (Void) — แหล่งเดียวของทั้ง POS และหน้าจอครัว
//
// เดิมสองหน้าจอมีรายการคนละชุด (L15) และ RPC ตัดสินคืนสต็อกด้วยการ match
// ข้อความไทย (A7.5) → เปลี่ยน label หรือพิมพ์ผิดตัวเดียว สต็อกก็เพี้ยนเงียบๆ
//
// ⚠️ ค่า `code` ต้องตรงกับ CASE ใน void_order_item
//    (supabase/migrations/20260828_audit_and_integrity.sql)
//    การคืนสต็อกตัดสินที่ฝั่ง DB เท่านั้น — `restoresStock` ที่นี่ใช้บอกผู้ใช้ให้รู้ตัวก่อนกด
// =============================================================

export interface VoidReason {
  code: string;
  label: string;
  /** สะท้อนพฤติกรรมของ DB เพื่อแสดงผล — ไม่ได้เป็นตัวตัดสิน */
  restoresStock: boolean;
}

export const VOID_REASONS: readonly VoidReason[] = [
  { code: 'wrong_key', label: 'คีย์ออเดอร์ผิด', restoresStock: true },
  { code: 'customer_changed', label: 'ลูกค้าเปลี่ยนใจ', restoresStock: false },
  { code: 'cooking_error', label: 'ทำอาหารผิดพลาด', restoresStock: false },
  { code: 'too_slow', label: 'รอนานเกินไป', restoresStock: false },
  { code: 'out_of_stock', label: 'วัตถุดิบหมดกลางคัน', restoresStock: false },
  { code: 'other', label: 'อื่นๆ (ระบุ)', restoresStock: false },
] as const;

export const VOID_REASON_OTHER = 'other';

export function voidReasonLabel(code: string): string {
  return VOID_REASONS.find(r => r.code === code)?.label ?? code;
}
