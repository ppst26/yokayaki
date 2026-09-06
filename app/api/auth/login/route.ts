import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signStaffToken, SESSION_COOKIE, SESSION_TTL_SECONDS, type EmployeeRole } from '@/lib/authToken';
import { readOrgAuthCookie } from '@/lib/orgAuthCookie';
import { clientKeyFrom, errorResponse } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseJsonBody } from '@/lib/api/parse';
import { loginBodySchema } from '@/lib/api/schemas';

const orgAuthSkip = process.env.M5_ORG_AUTH_SKIP === 'true';

type LoginAuditEvent = 'login_success' | 'login_fail';

async function insertLoginAudit(
  event: LoginAuditEvent,
  opts: { employeeId?: number; orgId?: string; ipHint: string },
): Promise<void> {
  const { error } = await supabaseAdmin.from('login_audit').insert({
    employee_id: opts.employeeId ?? null,
    org_id: opts.orgId ?? null,
    event,
    ip_hint: opts.ipHint,
  });
  if (error) console.error('[login] login_audit insert failed:', error);
}

// =============================================================
// POST /api/auth/login   { pin: "123456" }
// =============================================================

export async function POST(request: Request) {
  try {
    const ipHint = clientKeyFrom(request);

    const limited = enforceRateLimit({
      key: `login:${ipHint}`,
      max: 30,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const body = await parseJsonBody(request, loginBodySchema);
    if (body instanceof Response) return body;

    let orgAuth: Awaited<ReturnType<typeof readOrgAuthCookie>> = null;
    if (!orgAuthSkip) {
      orgAuth = await readOrgAuthCookie();
      if (!orgAuth) {
        return Response.json({ error: 'กรุณาเข้าสู่ระบบองค์กรก่อน' }, { status: 401 });
      }
    }

    const { data, error } = await supabaseAdmin.rpc('verify_pin', {
      p_pin: body.pin,
      p_client_key: ipHint,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;

    if (row?.locked_seconds > 0) {
      return Response.json(
        { error: 'ระบบถูกล็อคชั่วคราว กรุณารอจนครบกำหนดเวลา', lockedSeconds: row.locked_seconds },
        { status: 429 }
      );
    }

    if (!row?.emp_id) {
      await insertLoginAudit('login_fail', { ipHint });
      return Response.json({ error: 'รหัส PIN ไม่ถูกต้อง' }, { status: 401 });
    }

    const employee = {
      id: row.emp_id as number,
      name: (row.emp_name ?? '') as string,
      role: row.emp_role as EmployeeRole,
    };

    const { data: empRow, error: empError } = await supabaseAdmin
      .from('employees')
      .select('org_id, auth_user_id')
      .eq('id', row.emp_id)
      .single();

    if (empError || !empRow?.org_id) {
      return Response.json({ error: 'ไม่พบข้อมูลองค์กรของพนักงาน' }, { status: 500 });
    }

    if (!orgAuthSkip && orgAuth) {
      if (empRow.org_id !== orgAuth.orgId) {
        return Response.json({ error: 'พนักงานไม่ได้อยู่ในองค์กรที่เข้าสู่ระบบ' }, { status: 403 });
      }
      if (empRow.auth_user_id && empRow.auth_user_id !== orgAuth.authUserId) {
        return Response.json({ error: 'บัญชีพนักงานไม่ตรงกับผู้ใช้ที่เข้าสู่ระบบ' }, { status: 403 });
      }
    }

    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
    const deviceHint = request.headers.get('user-agent')?.slice(0, 512) ?? null;

    const { data: sessionRow, error: sessionError } = await supabaseAdmin
      .from('staff_sessions')
      .insert({
        employee_id: employee.id,
        org_id: empRow.org_id,
        expires_at: expiresAt,
        device_hint: deviceHint,
      })
      .select('id')
      .single();

    if (sessionError || !sessionRow?.id) {
      console.error('[login] staff_sessions insert failed:', sessionError);
      return Response.json({ error: 'ไม่สามารถสร้างเซสชันได้' }, { status: 500 });
    }

    const token = await signStaffToken({
      empId: employee.id,
      empName: employee.name,
      empRole: employee.role,
      orgId: empRow.org_id,
      sessionId: sessionRow.id,
    });

    await insertLoginAudit('login_success', {
      employeeId: employee.id,
      orgId: empRow.org_id,
      ipHint,
    });

    const response = Response.json({ employee, token });

    response.headers.append(
      'Set-Cookie',
      [
        `${SESSION_COOKIE}=${token}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${SESSION_TTL_SECONDS}`,
        process.env.NODE_ENV === 'production' ? 'Secure' : '',
      ]
        .filter(Boolean)
        .join('; ')
    );

    return response;
  } catch (err) {
    return errorResponse(err);
  }
}
