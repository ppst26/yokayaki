import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireManageEmployees, errorResponse } from '@/lib/session';
import { parseJsonBody, parseValue } from '@/lib/api/parse';
import {
  employeeDeleteBodySchema,
  employeeIdParamSchema,
  employeeUpdateBodySchema,
  pinSchema,
} from '@/lib/api/schemas';
import { pinLookupHash } from '@/lib/pinLookup';
import { assertStepUpPin } from '@/lib/stepUpPin';

const RESULT_MESSAGES: Record<string, string> = {
  not_found: 'ไม่พบพนักงานที่ต้องการ',
  pin_taken: 'PIN นี้ถูกใช้แล้ว กรุณาใช้ PIN อื่น',
  last_owner: 'ไม่สามารถทำรายการได้ เพราะจะทำให้ร้านไม่เหลือเจ้าของร้าน',
  self_delete: 'ไม่สามารถลบบัญชีของตัวเองได้',
};

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
