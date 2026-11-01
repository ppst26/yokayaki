// =============================================================
// เหตุผลการยกเลิกรายการ (Void) — แหล่งเดียวของทั้ง POS, หน้าจอครัว และประวัติการขาย
//
// ⚠️ ค่า `code` ต้องตรงกับ CASE ใน void_order_item และ void_completed_order
//    (supabase/migrations/20260828_audit_and_integrity.sql & 20261101_void_completed_order.sql)
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
  { code: 'wrong_bill', label: 'คีย์ผิด / คิดเงินผิดโต๊ะ', restoresStock: true },
  { code: 'customer_cancel', label: 'ลูกค้ายกเลิก / ขอคืนเงิน', restoresStock: true },
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
