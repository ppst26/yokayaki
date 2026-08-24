import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifyStaffToken, type StaffClaims } from '@/lib/authToken';

// =============================================================
// Trust boundary ของฝั่งพนักงาน
//
// แหล่งความจริงเดียวของ "ใครกำลังทำรายการนี้" คือ cookie httpOnly ที่ server เซ็นเอง
// ไม่ใช่ค่าที่ client ส่งมาใน body (เช่น employee_name เดิม)
// =============================================================

export async function getStaffSession(): Promise<StaffClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyStaffToken(token);
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** ต้องล็อกอินแล้ว (owner หรือ staff) */
export async function requireStaff(): Promise<StaffClaims> {
  const session = await getStaffSession();
  if (!session) throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');
  return session;
}

/** ต้องเป็น owner เท่านั้น */
export async function requireOwner(): Promise<StaffClaims> {
  const session = await requireStaff();
  if (session.empRole !== 'owner') {
    throw new HttpError(403, 'ต้องใช้สิทธิ์เจ้าของร้าน (Owner) เท่านั้น');
  }
  return session;
}

/** แปลง error เป็น Response — ใช้ปิดท้าย try/catch ของทุก route */
export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error('[api]', err);
  return Response.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
}

/** คีย์สำหรับนับความพยายามล็อกอิน — ใช้ IP ของผู้เรียก */
export function clientKeyFrom(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
