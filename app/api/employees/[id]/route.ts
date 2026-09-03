import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireOwner, errorResponse, clientKeyFrom, HttpError } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseJsonBody, parseValue } from '@/lib/api/parse';
import {
  employeeDeleteBodySchema,
  employeeIdParamSchema,
  employeeUpdateBodySchema,
  pinSchema,
} from '@/lib/api/schemas';

const RESULT_MESSAGES: Record<string, string> = {
  not_found: 'ไม่พบพนักงานที่ต้องการ',
  pin_taken: 'PIN นี้ถูกใช้แล้ว กรุณาใช้ PIN อื่น',
  last_owner: 'ไม่สามารถทำรายการได้ เพราะจะทำให้ร้านไม่เหลือเจ้าของร้าน',
  self_delete: 'ไม่สามารถลบบัญชีของตัวเองได้',
};

async function assertOwnerConfirmPin(request: Request, pin: string): Promise<void> {
  const limited = enforceRateLimit({
    key: `owner-confirm:${clientKeyFrom(request)}`,
    max: 15,
    windowMs: 60 * 1000,
  });
  if (limited) {
    throw new HttpError(429, 'ยืนยัน PIN ผิดหลายครั้ง กรุณารอก่อน');
  }

  const { data, error } = await supabaseAdmin.rpc('verify_pin', {
    p_pin: pin,
    p_client_key: clientKeyFrom(request),
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  if (row?.locked_seconds > 0) {
    throw new HttpError(429, 'ยืนยัน PIN ผิดหลายครั้ง ระบบถูกล็อคชั่วคราว');
  }
  if (!row?.emp_id || row.emp_role !== 'owner') {
    throw new HttpError(403, 'PIN ไม่ถูกต้อง หรือไม่ใช่ PIN ของ Owner');
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner();

    const { id: rawId } = await ctx.params;
    const id = parseValue(rawId, employeeIdParamSchema);
    if (id instanceof Response) return id;

    const body = await parseJsonBody(request, employeeUpdateBodySchema);
    if (body instanceof Response) return body;

    const name = body.name ?? null;
    const role = body.role ?? null;
    const pin = body.pin ?? null;

    if (role !== null || pin !== null) {
      const confirm = parseValue(body.confirmPin, pinSchema);
      if (confirm instanceof Response) {
        return Response.json({ error: 'กรุณากรอก PIN 6 หลักเพื่อยืนยันการทำรายการ' }, { status: 400 });
      }
      await assertOwnerConfirmPin(request, confirm);
    }

    const { data, error } = await supabaseAdmin.rpc('admin_update_employee', {
      p_employee_id: id,
      p_name: name,
      p_pin: pin,
      p_role: role,
    });
    if (error) throw error;

    if (data !== 'ok') {
      return Response.json(
        { error: RESULT_MESSAGES[data as string] ?? 'ไม่สามารถแก้ไขข้อมูลได้' },
        { status: data === 'not_found' ? 404 : 409 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireOwner();

    const { id: rawId } = await ctx.params;
    const id = parseValue(rawId, employeeIdParamSchema);
    if (id instanceof Response) return id;

    const body = await parseJsonBody(request, employeeDeleteBodySchema);
    if (body instanceof Response) return body;

    await assertOwnerConfirmPin(request, body.confirmPin);

    const { data, error } = await supabaseAdmin.rpc('admin_delete_employee', {
      p_employee_id: id,
      p_actor_id: actor.empId,
    });
    if (error) throw error;

    if (data !== 'ok') {
      return Response.json(
        { error: RESULT_MESSAGES[data as string] ?? 'ไม่สามารถลบพนักงานได้' },
        { status: data === 'not_found' ? 404 : 409 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
