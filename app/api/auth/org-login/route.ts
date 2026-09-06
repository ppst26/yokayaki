import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { setOrgAuthCookie } from '@/lib/orgAuthCookie';
import { clientKeyFrom, errorResponse } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseJsonBody } from '@/lib/api/parse';
import { orgLoginBodySchema } from '@/lib/api/schemas';

// =============================================================
// POST /api/auth/org-login   { email, password }
// Supabase Auth → ตรวจ memberships → ตั้ง yk_org_auth cookie
// =============================================================

export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit({
      key: `org-login:${clientKeyFrom(request)}`,
      max: 20,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const body = await parseJsonBody(request, orgLoginBodySchema);
    if (body instanceof Response) return body;

    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (authError || !authData.user) {
      return Response.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const authUserId = authData.user.id;

    const { data: memberships, error: memError } = await supabaseAdmin
      .from('memberships')
      .select('org_id')
      .eq('auth_user_id', authUserId);

    if (memError) throw memError;

    if (!memberships?.length) {
      return Response.json({ error: 'บัญชีนี้ยังไม่ได้ผูกกับร้านค้า' }, { status: 403 });
    }

    const orgId = memberships[0].org_id;

    const response = Response.json({ ok: true, orgId });
    response.headers.append('Set-Cookie', await setOrgAuthCookie({ authUserId, orgId }));
    return response;
  } catch (err) {
    return errorResponse(err);
  }
}
