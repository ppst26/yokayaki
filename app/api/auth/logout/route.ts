import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifyStaffToken } from '@/lib/authToken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { clientKeyFrom, errorResponse } from '@/lib/session';

// =============================================================
// POST /api/auth/logout — revoke session + clear cookie
// =============================================================

export async function POST(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    const ipHint = clientKeyFrom(request);

    if (token) {
      const claims = await verifyStaffToken(token);
      if (claims) {
        const { error: revokeError } = await supabaseAdmin
          .from('staff_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', claims.sessionId)
          .is('revoked_at', null);

        if (revokeError) {
          console.error('[logout] staff_sessions revoke failed:', revokeError);
        }

        const { error: auditError } = await supabaseAdmin.from('login_audit').insert({
          employee_id: claims.empId,
          org_id: claims.orgId,
          event: 'logout',
          ip_hint: ipHint,
        });
        if (auditError) console.error('[logout] login_audit insert failed:', auditError);
      }
    }

    const response = Response.json({ ok: true });
    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    );
    return response;
  } catch (err) {
    return errorResponse(err);
  }
}
