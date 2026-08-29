import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireOwner, errorResponse } from '@/lib/session';
import { parseJsonBody } from '@/lib/api/parse';
import { employeeCreateBodySchema } from '@/lib/api/schemas';

export async function GET() {
  try {
    await requireOwner();

    const { data, error } = await supabaseAdmin.rpc('admin_list_employees');
    if (error) throw error;

    return Response.json({ employees: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner();

    const body = await parseJsonBody(request, employeeCreateBodySchema);
    if (body instanceof Response) return body;

    const { data, error } = await supabaseAdmin.rpc('admin_add_employee', {
      p_name: body.name,
      p_pin: body.pin,
      p_role: body.role,
    });
    if (error) throw error;

    if (data === -1) {
      return Response.json({ error: 'PIN นี้ถูกใช้แล้ว กรุณาใช้ PIN อื่น' }, { status: 409 });
    }

    return Response.json({ id: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
