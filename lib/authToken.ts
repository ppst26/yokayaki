import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

// =============================================================
// JWT ของพนักงาน — เซ็นด้วย SUPABASE_JWT_SECRET (HS256)
//
// Supabase/PostgREST จะอ่าน claim `role` แล้วสลับ DB role ให้ตรงกัน
// ส่วน claim `emp_role` คือสิ่งที่ RLS policy (public.is_staff / is_owner) ใช้ตัดสิน
// =============================================================

const secretRaw = process.env.SUPABASE_JWT_SECRET;
if (!secretRaw) {
  throw new Error('[authToken] ไม่พบ SUPABASE_JWT_SECRET (Supabase Dashboard → Settings → API → JWT Secret)');
}
const secret = new TextEncoder().encode(secretRaw);

export const SESSION_COOKIE = 'yk_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 1 กะ

export type EmployeeRole = 'owner' | 'staff';

export interface StaffClaims {
  empId: number;
  empName: string;
  empRole: EmployeeRole;
}

/**
 * แปลง employee id (SERIAL) เป็น UUID คงที่
 * เพื่อให้ claim `sub` เป็น UUID ตามที่ Supabase คาดหวัง (auth.uid() cast ไม่พัง)
 */
function employeeUuid(id: number): string {
  return `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`;
}

export async function signStaffToken(claims: StaffClaims): Promise<string> {
  return new SignJWT({
    role: 'authenticated',
    emp_id: claims.empId,
    emp_name: claims.empName,
    emp_role: claims.empRole,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(employeeUuid(claims.empId))
    .setAudience('authenticated')
    .setIssuer('yokayaki-pos')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyStaffToken(token: string): Promise<StaffClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: 'authenticated',
      issuer: 'yokayaki-pos',
    });

    const empId = payload.emp_id;
    const empRole = payload.emp_role;
    const empName = payload.emp_name;

    if (typeof empId !== 'number') return null;
    if (empRole !== 'owner' && empRole !== 'staff') return null;

    return {
      empId,
      empName: typeof empName === 'string' ? empName : '',
      empRole,
    };
  } catch {
    // หมดอายุ / ลายเซ็นไม่ตรง / รูปแบบผิด — ถือว่าไม่มี session
    return null;
  }
}
