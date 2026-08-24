import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireOwner, errorResponse } from '@/lib/session';

// =============================================================
// /api/employees — owner เท่านั้น
//
// แก้ A3: authorization อยู่ตรงนี้ (claim จาก cookie ที่ server เซ็นเอง)
//         ไม่ใช่ใน RPC ที่ใครก็เรียกได้
// แก้ A2: ตาราง employees ไม่มี SELECT policy แล้ว — รายชื่อมาทางนี้ทางเดียว
// =============================================================

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

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const pin = body?.pin;
    const role = body?.role;

    if (!name) {
      return Response.json({ error: 'กรุณากรอกชื่อพนักงาน' }, { status: 400 });
    }
    if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return Response.json({ error: 'PIN ต้องเป็นตัวเลข 6 หลัก' }, { status: 400 });
    }
    if (role !== 'owner' && role !== 'staff') {
      return Response.json({ error: 'ตำแหน่งไม่ถูกต้อง' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('admin_add_employee', {
      p_name: name,
      p_pin: pin,
      p_role: role,
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
