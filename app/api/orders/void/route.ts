import { requireStaff, errorResponse, clientKeyFrom } from '@/lib/session';
import { requireStaffSupabase } from '@/lib/supabaseStaff';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseJsonBody } from '@/lib/api/parse';
import { voidOrderBodySchema } from '@/lib/api/schemas';

// =============================================================
// POST /api/orders/void — ยกเลิกรายการออเดอร์ (jwt audit จาก cookie)
// =============================================================

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();

    const limited = enforceRateLimit({
      key: `void:${staff.empId}:${clientKeyFrom(request)}`,
      max: 40,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const body = await parseJsonBody(request, voidOrderBodySchema);
    if (body instanceof Response) return body;

    const staffDb = await requireStaffSupabase();

    const { data: success, error } = await staffDb.rpc('void_order_item', {
      p_order_item_id: body.orderItemId,
      p_void_quantity: body.voidQuantity,
      p_reason_code: body.reasonCode,
      p_reason_note: body.reasonNote,
    });

    if (error) throw error;

    if (!success) {
      return Response.json({ error: 'ไม่สามารถ Void รายการได้' }, { status: 409 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
