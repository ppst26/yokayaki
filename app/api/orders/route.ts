import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  orderLinesToRpcJson,
  staffOrderBodySchema,
} from '@/lib/api/schemas';
import { parseJsonBody } from '@/lib/api/parse';
import { orderBatchErrorMessage } from '@/lib/orderBatchErrors';
import { requireStaff, errorResponse, clientKeyFrom } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rateLimit';

// =============================================================
// POST /api/orders   { tableId, items: [{ menuItemId, quantity, notes }] }
// =============================================================

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();

    const limited = enforceRateLimit({
      key: `orders:${staff.empId}:${clientKeyFrom(request)}`,
      max: 60,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const body = await parseJsonBody(request, staffOrderBodySchema);
    if (body instanceof Response) return body;

    const { data: menuRows, error: menuError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name')
      .in('id', body.items.map(i => i.menuItemId));

    if (menuError) throw menuError;

    const nameById = new Map<number, string>();
    for (const row of menuRows ?? []) {
      nameById.set(row.id, row.name);
    }

    const { data, error } = await supabaseAdmin.rpc('place_order_batch', {
      p_table_id: body.tableId,
      p_items: orderLinesToRpcJson(body.items),
    });

    if (error) {
      return Response.json(
        { error: orderBatchErrorMessage(error, nameById) },
        { status: 409 }
      );
    }

    return Response.json({
      orderId: data?.order_id ?? null,
      placed: data?.placed ?? body.items.length,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
