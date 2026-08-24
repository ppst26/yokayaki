import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse } from '@/lib/session';
import { requireCustomerSession } from '@/lib/customerSession';

// =============================================================
// GET /api/customer/[session_id]/state
//
// จุดเดียวที่หน้าลูกค้าดึงข้อมูล — แทน realtime subscription 5 ช่องเดิม
// ที่เปิดให้ anon อ่าน tables/orders/order_items/menu_items/qr_sessions ทั้งร้าน
//
// เมนูส่งไปเฉพาะฟิลด์ที่หน้าลูกค้าใช้จริง (ไม่ส่ง `select('*')` ซึ่งรวมต้นทุน/สต็อกดิบ)
// =============================================================

export async function GET(_request: Request, ctx: RouteContext<'/api/customer/[session_id]/state'>) {
  try {
    const { session_id: sessionId } = await ctx.params;

    let tableId: number;
    try {
      ({ tableId } = await requireCustomerSession(sessionId));
    } catch (err) {
      // เซสชันจบแล้ว = จบการสั่ง ไม่ใช่ error ที่ต้องขึ้นหน้าจอแดง
      return Response.json({ sessionActive: false });
    }

    const [tableRes, menuRes, promoRes, orderRes] = await Promise.all([
      supabaseAdmin.from('tables').select('status').eq('id', tableId).maybeSingle(),
      supabaseAdmin
        .from('menu_items')
        .select('id, name, price, stock, category, image_url')
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
