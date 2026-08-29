import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signStaffToken, SESSION_COOKIE, SESSION_TTL_SECONDS, type EmployeeRole } from '@/lib/authToken';
import { clientKeyFrom, errorResponse } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseJsonBody } from '@/lib/api/parse';
import { loginBodySchema } from '@/lib/api/schemas';

// =============================================================
// POST /api/auth/login   { pin: "123456" }
// =============================================================

export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit({
      key: `login:${clientKeyFrom(request)}`,
      max: 30,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const body = await parseJsonBody(request, loginBodySchema);
    if (body instanceof Response) return body;

    const { data, error } = await supabaseAdmin.rpc('verify_pin', {
      p_pin: body.pin,
      p_client_key: clientKeyFrom(request),
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
      return Response.json({ error: 'รหัส PIN ไม่ถูกต้อง' }, { status: 401 });
    }

    const employee = {
      id: row.emp_id as number,
      name: (row.emp_name ?? '') as string,
      role: row.emp_role as EmployeeRole,
    };

    const token = await signStaffToken({
      empId: employee.id,
      empName: employee.name,
      empRole: employee.role,
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
