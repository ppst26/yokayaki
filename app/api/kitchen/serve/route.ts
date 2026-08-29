import { requireStaff, errorResponse, clientKeyFrom } from '@/lib/session';
import { requireStaffSupabase } from '@/lib/supabaseStaff';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseJsonBody } from '@/lib/api/parse';
import { kitchenServeBatchSchema } from '@/lib/api/schemas';

// =============================================================
// POST /api/kitchen/serve — mark หลายรายการเป็น served พร้อมกัน
// =============================================================

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();

    const limited = enforceRateLimit({
      key: `kitchen-serve-batch:${staff.empId}:${clientKeyFrom(request)}`,
      max: 60,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const body = await parseJsonBody(request, kitchenServeBatchSchema);
    if (body instanceof Response) return body;

    const staffDb = await requireStaffSupabase();

    const { error } = await staffDb
      .from('order_items')
      .update({ status: 'served' })
      .in('id', body.itemIds);

    if (error) throw error;

    return Response.json({ ok: true, served: body.itemIds.length });
  } catch (err) {
    return errorResponse(err);
  }
}
