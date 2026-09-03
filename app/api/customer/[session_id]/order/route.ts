import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse } from '@/lib/session';
import { requireCustomerSession } from '@/lib/customerSession';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseJsonBody, parseValue } from '@/lib/api/parse';
import {
  customerOrderBodySchema,
  orderLinesToRpcJson,
  sessionIdSchema,
} from '@/lib/api/schemas';
import { orderBatchErrorMessage } from '@/lib/orderBatchErrors';

// =============================================================
// POST /api/customer/[session_id]/order
// =============================================================

export async function POST(
  request: Request,
  ctx: { params: Promise<{ session_id: string }> }
) {
  try {
    const { session_id: rawSessionId } = await ctx.params;
    const sessionId = parseValue(rawSessionId, sessionIdSchema);
    if (sessionId instanceof Response) return sessionId;

    const limited = enforceRateLimit({
      key: `customer-order:${sessionId}`,
      max: 20,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    await requireCustomerSession(sessionId);

    const body = await parseJsonBody(request, customerOrderBodySchema);
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

    const { data, error } = await supabaseAdmin.rpc('customer_place_order_batch', {
      p_session_id: sessionId,
      p_items: orderLinesToRpcJson(body.items),
    });

    if (error) {
      return Response.json(
        { error: orderBatchErrorMessage(error, nameById) },
        { status: 409 }
      );
    }

    return Response.json({
      placed: data?.placed ?? body.items.length,
      orderId: data?.order_id ?? null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
