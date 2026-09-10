import {
  orderLinesToRpcJson,
  staffOrderBodySchema,
} from '@/lib/api/schemas';
import { parseJsonBody } from '@/lib/api/parse';
import { orderBatchErrorMessage } from '@/lib/orderBatchErrors';
import { requireStaff, errorResponse, clientKeyFrom } from '@/lib/session';
import { requireStaffSupabase } from '@/lib/supabaseStaff';
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

    const staffDb = await requireStaffSupabase();

    const menuItemIds = body.items.map(i => i.menuItemId);

    const { data, error } = await staffDb.rpc('place_order_batch', {
      p_table_id: body.tableId,
      p_items: orderLinesToRpcJson(body.items),
    });

    // ชื่อเมนูใช้แค่ตอนประกอบข้อความ error — เดิมยิงไว้ก่อนทุกครั้ง
    // เสีย round trip ฟรีในเส้นทางที่สำเร็จ ซึ่งเป็นเส้นทางปกติ (PERF/3)
    if (error) {
      const { data: menuRows } = await staffDb
        .from('menu_items')
        .select('id, name')
        .in('id', menuItemIds);

      const nameById = new Map<number, string>();
      for (const row of menuRows ?? []) {
        nameById.set(row.id, row.name);
      }

      return Response.json(
        { error: orderBatchErrorMessage(error, nameById) },
        { status: 409 }
      );
    }

    const batch = data as { order_id?: number; placed?: number } | null;
    const orderId = batch?.order_id ?? null;

    // คืนสถานะหลังสั่งมาให้เลย — client จะได้ไม่ต้องยิงตามอีก 3 รอบ (PERF/3)
    const [itemsRes, stockRes] = await Promise.all([
      orderId === null
        ? Promise.resolve({ data: null })
        : staffDb
            .from('order_items')
            .select('id, quantity, unit_price, status, notes, menu_items(name)')
            .eq('order_id', orderId)
            .order('id', { ascending: true }),
      staffDb.from('menu_items').select('id, stock').in('id', menuItemIds),
    ]);

    return Response.json({
      orderId,
      placed: batch?.placed ?? body.items.length,
      orderedItems: itemsRes.data ?? [],
      stockUpdates: stockRes.data ?? [],
    });
  } catch (err) {
    return errorResponse(err);
  }
}
