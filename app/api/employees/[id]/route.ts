import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireOwner, errorResponse, clientKeyFrom, HttpError } from '@/lib/session';

// ข้อความตอบกลับของ RPC → ข้อความไทยที่ผู้ใช้อ่านรู้เรื่อง
const RESULT_MESSAGES: Record<string, string> = {
  not_found: 'ไม่พบพนักงานที่ต้องการ',
  pin_taken: 'PIN นี้ถูกใช้แล้ว กรุณาใช้ PIN อื่น',
  last_owner: 'ไม่สามารถทำรายการได้ เพราะจะทำให้ร้านไม่เหลือเจ้าของร้าน',
  self_delete: 'ไม่สามารถลบบัญชีของตัวเองได้',
};

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Step-up authentication — ยืนยัน PIN ของ Owner อีกครั้งก่อนทำรายการที่อันตราย
 * (เปลี่ยนตำแหน่ง / เปลี่ยน PIN / ลบพนักงาน) เหมือน UX เดิม
 *
 * ต่างจากเดิมตรงที่ไม่มีการส่ง pin_hash ข้ามเน็ต และไม่มีการ query .eq('pin_hash', ...)
 * ซึ่งเป็น PIN oracle ตัวที่สองของระบบ
 */
async function assertOwnerConfirmPin(request: Request, pin: unknown): Promise<void> {
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
    throw new HttpError(400, 'กรุณากรอก PIN 6 หลักเพื่อยืนยันการทำรายการ');
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

export async function PATCH(request: Request, ctx: RouteContext<'/api/employees/[id]'>) {
  try {
    await requireOwner();

    const { id: rawId } = await ctx.params;
    const id = parseId(rawId);
    if (id === null) return Response.json({ error: 'รหัสพนักงานไม่ถูกต้อง' }, { status: 400 });

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : null;
    const role = body?.role === 'owner' || body?.role === 'staff' ? body.role : null;
    const pin = typeof body?.pin === 'string' && body.pin ? body.pin : null;

    if (pin !== null && !/^\d{6}$/.test(pin)) {
      return Response.json({ error: 'PIN ต้องเป็นตัวเลข 6 หลัก' }, { status: 400 });
    }

    // เปลี่ยนตำแหน่งหรือเปลี่ยน PIN = ต้องยืนยันตัวตนซ้ำ
    if (role !== null || pin !== null) {
      await assertOwnerConfirmPin(request, body?.confirmPin);
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

export async function DELETE(request: Request, ctx: RouteContext<'/api/employees/[id]'>) {
  try {
    // ตัวตนผู้สั่งลบมาจาก JWT — client ปลอมไม่ได้ (เดิมส่ง pin_hash ของ owner มาใน body)
    const actor = await requireOwner();

    const { id: rawId } = await ctx.params;
    const id = parseId(rawId);
    if (id === null) return Response.json({ error: 'รหัสพนักงานไม่ถูกต้อง' }, { status: 400 });

    const body = await request.json().catch(() => null);
    await assertOwnerConfirmPin(request, body?.confirmPin);

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
