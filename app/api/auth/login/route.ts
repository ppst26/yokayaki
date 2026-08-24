import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { signStaffToken, SESSION_COOKIE, SESSION_TTL_SECONDS, type EmployeeRole } from '@/lib/authToken';
import { clientKeyFrom, errorResponse } from '@/lib/session';

// =============================================================
// POST /api/auth/login   { pin: "123456" }
//
// จุดเดียวในระบบที่ PIN ถูกตรวจสอบ — และตรวจใน DB ผ่าน verify_pin()
// hash ไม่เคยออกจากฐานข้อมูล (แก้ A2: เดิม client query .eq('pin_hash', ...) ตรงๆ = PIN oracle)
// =============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const pin = body?.pin;

    if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return Response.json({ error: 'รหัส PIN ต้องเป็นตัวเลข 6 หลัก' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('verify_pin', {
      p_pin: pin,
      p_client_key: clientKeyFrom(request),
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;

    // ถูกล็อกจากการกรอกผิดหลายครั้ง (นับฝั่ง server — ลบ localStorage ไม่ช่วย)
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

    // token อยู่ใน body เพื่อให้ supabase-js ฝั่ง browser ใช้อ่านข้อมูล + realtime
    // ส่วน cookie httpOnly คือสิ่งที่ยืนยันตัวตนกับ server tier (JS แตะไม่ได้)
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
