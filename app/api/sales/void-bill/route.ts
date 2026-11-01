import { requireStaff, errorResponse, clientKeyFrom } from '@/lib/session';
import { requireStaffSupabase } from '@/lib/supabaseStaff';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseJsonBody } from '@/lib/api/parse';
import { voidCompletedBillBodySchema } from '@/lib/api/schemas';
import { assertStepUpPin } from '@/lib/stepUpPin';

// =============================================================
// POST /api/sales/void-bill — ยกเลิกบิลที่ปิดแล้ว (Void Bill)
// - ตรวจสอบ Session พนักงาน
// - ยืนยันสิทธิ์ด้วย PIN ขั้นสูงของ Owner / Manager (Step-up verification)
// - เรียก void_completed_order RPC แบบ atomic transaction
// =============================================================

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();

    const limited = enforceRateLimit({
      key: `void-bill:${staff.empId}:${clientKeyFrom(request)}`,
      max: 10,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const body = await parseJsonBody(request, voidCompletedBillBodySchema);
    if (body instanceof Response) return body;

    // ยืนยัน PIN ของ Owner หรือ Manager
    await assertStepUpPin(request, body.pin, staff);

    const staffDb = await requireStaffSupabase();

    const { data, error } = await staffDb.rpc('void_completed_order', {
      p_order_id: body.orderId,
      p_reason_code: body.reasonCode,
      p_reason_note: body.reasonNote ?? null,
    });

    if (error) {
      if (error.message.includes('order_not_completed')) {
        return Response.json({ error: 'บิลนี้ไม่ได้อยู่ในสถานะปิดบิลแล้ว หรือถูกยกเลิกไปแล้ว' }, { status: 409 });
      }
      if (error.message.includes('order_not_found')) {
        return Response.json({ error: 'ไม่พบบิลที่ต้องการยกเลิก' }, { status: 404 });
      }
      if (error.message.includes('forbidden')) {
        return Response.json({ error: 'ไม่มีสิทธิ์ในการยกเลิกบิล' }, { status: 403 });
      }
      throw error;
    }

    return Response.json({ ok: true, result: data });
  } catch (err) {
    return errorResponse(err);
  }
}

