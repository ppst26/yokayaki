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

// จำนวน proxy ที่เราเชื่อถือระหว่างผู้ใช้กับ server (Vercel / nginx ชั้นเดียว = 1)
// ตั้งผ่าน env ได้เมื่อ deploy หลัง proxy หลายชั้น
const TRUSTED_PROXY_HOPS = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? '1') || 1);

/**
 * คีย์สำหรับนับความพยายามล็อกอิน — ต้องเป็นค่าที่ผู้เรียก **ปลอมไม่ได้**
 *
 * ของเดิมหยิบ `x-forwarded-for` ตัวซ้ายสุด ซึ่งเป็นค่าที่ client เขียนมาเองได้
 * → สุ่ม header ทุก request = ได้ตัวนับใหม่ทุกครั้ง = lockout ไม่มีผล (หางของ A2)
 *
 * ของใหม่: เชื่อเฉพาะส่วนที่ proxy ของเราเป็นคนเขียน
 *   1. header ที่แพลตฟอร์มเขียนทับให้เสมอ (Vercel / Cloudflare)
 *   2. `x-forwarded-for` นับจาก **ขวา** ตามจำนวน hop ที่เชื่อถือ
 *      (ค่าที่ client ปลอมมาจะถูกดันไปอยู่ทางซ้ายเสมอ)
 */
export function clientKeyFrom(request: Request): string {
  const h = request.headers;

  const platformIp = h.get('x-vercel-forwarded-for') ?? h.get('cf-connecting-ip');
  if (platformIp) return normalizeIp(platformIp.split(',')[0]);

  const chain = (h.get('x-forwarded-for') ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  if (chain.length) {
    // hop=1 → ตัวขวาสุดคือค่าที่ proxy ของเราเพิ่งเติมเข้ามา
    const index = Math.max(0, chain.length - TRUSTED_PROXY_HOPS);
    return normalizeIp(chain[index]);
  }

  const realIp = h.get('x-real-ip');
  return realIp ? normalizeIp(realIp) : 'unknown';
}

/** ตัดพอร์ตและ normalize ให้ IP เดียวกันไม่แตกเป็นหลายคีย์ */
function normalizeIp(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/^\[|\]$/g, '');
  // IPv4 ที่มีพอร์ตต่อท้าย เช่น 203.0.113.9:51514 (IPv6 มี ':' หลายตัว จึงไม่ตัด)
  const colons = value.split(':').length - 1;
  if (colons === 1) return value.split(':')[0];
  return value || 'unknown';
}
