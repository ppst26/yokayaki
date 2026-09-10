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

    let tableId: string;
    let orgId: string;
    try {
      ({ tableId, orgId } = await requireCustomerSession(sessionId));
    } catch {
      return Response.json({ sessionActive: false });
    }

    const [tableRes, menuRes, promoRes, orderRes] = await Promise.all([
      supabaseAdmin.from('tables').select('status, table_number').eq('id', tableId).maybeSingle(),
      supabaseAdmin
        .from('menu_items')
        .select('id, name, price, stock, category, image_url, is_happy_hour, happy_hour_price')
        .eq('org_id', orgId)
        .order('id', { ascending: true }),
      supabaseAdmin
        .from('promotions')
        .select('id, name, type, discount_percent, discount_amount, min_order_amount, is_active, image_url, start_time, end_time')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      // PERF/6 — ฝัง order_items มาเลย เดิมต้องรอ orders เสร็จก่อนแล้วยิงอีกรอบ
      // หน้านี้ poll ทุก 5 วิ จึงจ่ายค่า round trip ส่วนเกินนี้ตลอดเวลาที่ลูกค้าเปิดจออยู่
      supabaseAdmin
        .from('orders')
        .select('id, order_items(id, quantity, unit_price, status, notes, menu_items(name))')
        .eq('table_id', tableId)
        .eq('status', 'active')
        .maybeSingle(),
    ]);

    if (menuRes.error) throw menuRes.error;

    const orderRow = orderRes.data as
      | { id: number; order_items?: { id: number }[] | null }
      | null;

    const orderedItems = [...(orderRow?.order_items ?? [])].sort((a, b) => a.id - b.id);

    return Response.json({
      sessionActive: true,
      tableId,
      tableNumber: tableRes.data?.table_number ?? null,
      tableStatus: tableRes.data?.status ?? 'occupied',
      orderActive: Boolean(orderRow?.id),
      menuItems: menuRes.data ?? [],
      promotions: promoRes.data ?? [],
      orderedItems,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
