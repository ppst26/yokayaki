import { supabaseAdmin, createIsolatedServiceClient } from '@/lib/supabaseAdmin';
import { requireManageEmployees, errorResponse, clientKeyFrom, HttpError } from '@/lib/session';
import type { StaffClaims } from '@/lib/authToken';
import type { EmployeeRole } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/rateLimit';
import { pinLookupHash } from '@/lib/pinLookup';
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

const STEP_UP_ROLES: EmployeeRole[] = ['owner', 'manager'];

async function assertStepUpPin(request: Request, pin: string, actor: StaffClaims): Promise<void> {
  const limited = enforceRateLimit({
    key: `owner-confirm:${clientKeyFrom(request)}`,
    max: 15,
    windowMs: 60 * 1000,
  });
  if (limited) {
    throw new HttpError(429, 'ยืนยัน PIN ผิดหลายครั้ง กรุณารอก่อน');
  }

  // client แยก — ห้ามใช้ singleton หลัง org-login (JWT จะกลายเป็น authenticated)
  const db = createIsolatedServiceClient();
  const { data, error } = await db.rpc('verify_pin', {
    p_pin: pin,
    p_client_key: clientKeyFrom(request),
    p_pin_lookup: pinLookupHash(pin),
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  if (row?.locked_seconds > 0) {
    throw new HttpError(429, 'ยืนยัน PIN ผิดหลายครั้ง ระบบถูกล็อคชั่วคราว');
  }
  if (!row?.emp_id || !STEP_UP_ROLES.includes(row.emp_role as EmployeeRole)) {
    throw new HttpError(403, 'PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์อนุมัติรายการนี้');
  }

  const { data: empRow, error: empError } = await supabaseAdmin
    .from('employees')
    .select('org_id')
    .eq('id', row.emp_id)
    .single();

  if (empError || empRow?.org_id !== actor.orgId) {
    throw new HttpError(403, 'PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์อนุมัติรายการนี้');
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireManageEmployees();

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
      await assertStepUpPin(request, confirm, actor);
    }

    const { data, error } = await supabaseAdmin.rpc('admin_update_employee', {
      p_employee_id: id,
      p_name: name,
      p_pin: pin,
      p_role: role,
      p_pin_lookup: pin === null ? null : pinLookupHash(pin),
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
    const actor = await requireManageEmployees();

    const { id: rawId } = await ctx.params;
    const id = parseValue(rawId, employeeIdParamSchema);
    if (id instanceof Response) return id;

    const body = await parseJsonBody(request, employeeDeleteBodySchema);
    if (body instanceof Response) return body;

    await assertStepUpPin(request, body.confirmPin, actor);

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
