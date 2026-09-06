import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireManageEmployees, clientKeyFrom, errorResponse } from '@/lib/session';

// =============================================================
// POST /api/auth/sessions/[id]/revoke — owner/manager force-logout
// =============================================================

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireManageEmployees();
    const { id: sessionId } = await ctx.params;

    const { data: target, error: fetchError } = await supabaseAdmin
      .from('staff_sessions')
      .select('id, employee_id, org_id, revoked_at')
      .eq('id', sessionId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!target) {
      return Response.json({ error: 'ไม่พบเซสชัน' }, { status: 404 });
    }
    if (target.org_id !== actor.orgId) {
      return Response.json({ error: 'ไม่มีสิทธิ์จัดการเซสชันนี้' }, { status: 403 });
    }

    if (!target.revoked_at) {
      const { error: revokeError } = await supabaseAdmin
        .from('staff_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (revokeError) throw revokeError;

      const { error: auditError } = await supabaseAdmin.from('login_audit').insert({
        employee_id: target.employee_id,
        org_id: target.org_id,
        event: 'revoke',
        ip_hint: clientKeyFrom(request),
      });
      if (auditError) console.error('[revoke] login_audit insert failed:', auditError);
    }

    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
