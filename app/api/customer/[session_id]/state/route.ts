import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse } from '@/lib/session';
import { requireCustomerSession } from '@/lib/customerSession';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseValue } from '@/lib/api/parse';
import { sessionIdSchema } from '@/lib/api/schemas';

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ session_id: string }> }
) {
  try {
    const { session_id: rawSessionId } = await ctx.params;
    const sessionId = parseValue(rawSessionId, sessionIdSchema);
    if (sessionId instanceof Response) return sessionId;

    const limited = enforceRateLimit({
      key: `customer-state:${sessionId}`,
      max: 120,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    let tableId: number;
    try {
      ({ tableId } = await requireCustomerSession(sessionId));
    } catch {
      return Response.json({ sessionActive: false });
    }

    const [tableRes, menuRes, promoRes, orderRes] = await Promise.all([
      supabaseAdmin.from('tables').select('status').eq('id', tableId).maybeSingle(),
      supabaseAdmin
        .from('menu_items')
        .select('id, name, price, stock, category, image_url, is_happy_hour, happy_hour_price')
        .order('id', { ascending: true }),
      supabaseAdmin
        .from('promotions')
        .select('id, name, type, discount_percent, discount_amount, min_order_amount, is_active, image_url, start_time, end_time')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('orders')
        .select('id')
        .eq('table_id', tableId)
        .eq('status', 'active')
        .maybeSingle(),
    ]);

    if (menuRes.error) throw menuRes.error;

    let orderedItems: unknown[] = [];
    if (orderRes.data?.id) {
      const { data: items, error } = await supabaseAdmin
        .from('order_items')
        .select('id, quantity, unit_price, status, notes, menu_items(name)')
        .eq('order_id', orderRes.data.id)
        .order('id', { ascending: true });
      if (error) throw error;
      orderedItems = items ?? [];
    }

    return Response.json({
      sessionActive: true,
      tableId,
      tableStatus: tableRes.data?.status ?? 'occupied',
      orderActive: Boolean(orderRes.data?.id),
      menuItems: menuRes.data ?? [],
      promotions: promoRes.data ?? [],
      orderedItems,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
