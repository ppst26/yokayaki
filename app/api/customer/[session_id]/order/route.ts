import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse } from '@/lib/session';
import { requireCustomerSession } from '@/lib/customerSession';

// =============================================================
// POST /api/customer/[session_id]/order   { items: [{ menuItemId, quantity, notes }] }
//
// เดิมหน้าลูกค้า loop เรียก RPC ตรงจากเบราว์เซอร์ทีละรายการ พร้อมส่ง p_unit_price มาเอง
// ตอนนี้ราคามาจาก menu_items ฝั่ง server เท่านั้น — ลูกค้าส่งได้แค่ "อยากได้อะไร กี่ที่"
// =============================================================

const MAX_ITEMS = 40;

interface RequestedItem {
  menuItemId: number;
  quantity: number;
  notes: string | null;
}

function parseItems(raw: unknown): RequestedItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ITEMS) return null;

  const items: RequestedItem[] = [];
  for (const entry of raw) {
    const menuItemId = Number((entry as Record<string, unknown>)?.menuItemId);
    const quantity = Number((entry as Record<string, unknown>)?.quantity);
    const rawNotes = (entry as Record<string, unknown>)?.notes;

    if (!Number.isInteger(menuItemId) || menuItemId <= 0) return null;
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) return null;

    items.push({
      menuItemId,
      quantity,
      notes: typeof rawNotes === 'string' && rawNotes.trim() ? rawNotes.trim().slice(0, 255) : null,
    });
  }
  return items;
}

export async function POST(request: Request, ctx: RouteContext<'/api/customer/[session_id]/order'>) {
  try {
    const { session_id: sessionId } = await ctx.params;
    await requireCustomerSession(sessionId);

    const body = await request.json().catch(() => null);
    const items = parseItems(body?.items);
    if (!items) {
      return Response.json({ error: 'รายการสั่งอาหารไม่ถูกต้อง' }, { status: 400 });
    }

    // ราคาไม่ผ่านมือใครทั้งสิ้น — RPC อ่าน menu_items.price เองใน DB (A4)
    // ดึงชื่อมาไว้เพื่อรายงานว่ารายการไหนล้มเหลวเท่านั้น
    const { data: menuRows, error: menuError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name')
      .in('id', items.map(i => i.menuItemId));

    if (menuError) throw menuError;

    const nameById = new Map<number, string>();
    for (const row of menuRows ?? []) {
      nameById.set(row.id, row.name);
    }

    const failed: string[] = [];
    let placed = 0;

    for (const item of items) {
      const { data: success, error } = await supabaseAdmin.rpc('customer_place_order_item', {
        p_session_id: sessionId,
        p_menu_item_id: item.menuItemId,
        p_quantity: item.quantity,
        p_notes: item.notes,
      });

      if (error || !success) {
        console.error('[customer/order] วางออเดอร์ไม่สำเร็จ', item.menuItemId, error);
        failed.push(nameById.get(item.menuItemId) ?? `เมนู #${item.menuItemId}`);
        continue;
      }
      placed += 1;
    }

    if (failed.length > 0) {
      return Response.json(
        {
          placed,
          failed,
          error: `ออเดอร์ล้มเหลวจำนวน ${failed.length} รายการ อาจเป็นเพราะสต็อกหมดหรือเซสชันหมดอายุ`,
        },
        { status: 409 }
      );
    }

    return Response.json({ placed });
  } catch (err) {
    return errorResponse(err);
  }
}
