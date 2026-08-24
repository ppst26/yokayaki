import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifyStaffToken } from '@/lib/authToken';

// =============================================================
// GET /api/auth/session
//
// เรียกตอนแอปโหลด เพื่อคืน token เข้า memory ของ browser client
// (token ไม่ถูกเก็บใน localStorage — reload แล้วต้องขอใหม่จาก cookie)
// =============================================================

export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return Response.json({ employee: null, token: null });
  }

  const claims = await verifyStaffToken(token);
  if (!claims) {
    return Response.json({ employee: null, token: null });
  }

  return Response.json({
    employee: { id: claims.empId, name: claims.empName, role: claims.empRole },
    token,
  });
}
