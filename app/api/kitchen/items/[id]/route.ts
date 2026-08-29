import { requireStaff, errorResponse, clientKeyFrom } from '@/lib/session';
import { requireStaffSupabase } from '@/lib/supabaseStaff';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseValue } from '@/lib/api/parse';
import { orderItemIdParamSchema } from '@/lib/api/schemas';

// =============================================================
// PATCH /api/kitchen/items/[id] — mark served
// =============================================================

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await requireStaff();

    const { id: rawId } = await ctx.params;
    const id = parseValue(rawId, orderItemIdParamSchema);
    if (id instanceof Response) return id;

    const limited = enforceRateLimit({
      key: `kitchen-serve:${staff.empId}:${clientKeyFrom(request)}`,
      max: 120,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const staffDb = await requireStaffSupabase();

    const { error } = await staffDb
      .from('order_items')
      .update({ status: 'served' })
      .eq('id', id);

    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
