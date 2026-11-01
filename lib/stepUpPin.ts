import 'server-only';
import { supabaseAdmin, createIsolatedServiceClient } from '@/lib/supabaseAdmin';
import { clientKeyFrom, HttpError } from '@/lib/session';
import type { StaffClaims } from '@/lib/authToken';
import type { EmployeeRole } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/rateLimit';
import { pinLookupHash } from '@/lib/pinLookup';

const STEP_UP_ROLES: EmployeeRole[] = ['owner', 'manager'];

export interface StepUpAuthorizer {
  empId: number;
  empName: string;
  empRole: EmployeeRole;
}

/**
 * ยืนยันสิทธิ์ขั้นสูงด้วย PIN 6 หลักของ Owner หรือ Manager (Step-up verification)
 * - นับความพยายามผิดผ่าน enforceRateLimit
 * - เรียก verify_pin RPC ตรวจ bcrypt + lockout
 * - ตรวจสอบว่าพนักงานสังกัด org_id เดียวกันกับผู้เรียก
 */
export async function assertStepUpPin(
  request: Request,
  pin: string,
  actor: StaffClaims
): Promise<StepUpAuthorizer> {
  const limited = enforceRateLimit({
    key: `owner-confirm:${clientKeyFrom(request)}`,
    max: 15,
    windowMs: 60 * 1000,
  });
  if (limited) {
    throw new HttpError(429, 'ยืนยัน PIN ผิดหลายครั้ง กรุณารอก่อน');
  }

  // client แยก — ห้ามใช้ singleton หลัง org-login (JWT จะกลายเป็น authenticated)
  const db = createIsolatedServiceClient();
  const { data, error } = await db.rpc('verify_pin', {
    p_pin: pin,
    p_client_key: clientKeyFrom(request),
    p_pin_lookup: pinLookupHash(pin),
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  if (row?.locked_seconds > 0) {
    throw new HttpError(429, 'ยืนยัน PIN ผิดหลายครั้ง ระบบถูกล็อคชั่วคราว');
  }
  if (!row?.emp_id || !STEP_UP_ROLES.includes(row.emp_role as EmployeeRole)) {
    throw new HttpError(403, 'PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์อนุมัติรายการนี้');
  }

  const { data: empRow, error: empError } = await supabaseAdmin
    .from('employees')
    .select('org_id, name')
    .eq('id', row.emp_id)
    .single();

  if (empError || empRow?.org_id !== actor.orgId) {
    throw new HttpError(403, 'PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์อนุมัติรายการนี้');
  }

  return {
    empId: row.emp_id,
    empName: empRow.name ?? 'ผู้จัดการ',
    empRole: row.emp_role as EmployeeRole,
  };
}

