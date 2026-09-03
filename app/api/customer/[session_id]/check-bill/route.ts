import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse } from '@/lib/session';
import { requireCustomerSession } from '@/lib/customerSession';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseValue } from '@/lib/api/parse';
import { sessionIdSchema } from '@/lib/api/schemas';

async function setTableStatus(
  sessionId: string,
  next: 'checking_out' | 'occupied'
): Promise<Response> {
  const { tableId } = await requireCustomerSession(sessionId);

  const { data: activeOrder, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('table_id', tableId)
    .eq('status', 'active')
    .maybeSingle();

  if (orderError) throw orderError;
  if (!activeOrder) {
    return Response.json({ tableStatus: null, orderActive: false });
  }

  const { error } = await supabaseAdmin
    .from('tables')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', tableId);

  if (error) throw error;

  return Response.json({ tableStatus: next, orderActive: true });
}

async function handleCheckBill(
  request: Request,
  ctx: { params: Promise<{ session_id: string }> },
  next: 'checking_out' | 'occupied'
) {
  const { session_id: rawSessionId } = await ctx.params;
  const sessionId = parseValue(rawSessionId, sessionIdSchema);
  if (sessionId instanceof Response) return sessionId;

  const limited = enforceRateLimit({
    key: `customer-check-bill:${sessionId}`,
    max: 15,
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  return await setTableStatus(sessionId, next);
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ session_id: string }> }
) {
  try {
    return await handleCheckBill(request, ctx, 'checking_out');
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ session_id: string }> }
) {
  try {
    return await handleCheckBill(request, ctx, 'occupied');
  } catch (err) {
    return errorResponse(err);
  }
}
