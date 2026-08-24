import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { errorResponse } from '@/lib/session';
import { requireCustomerSession } from '@/lib/customerSession';

// =============================================================
// POST   /api/customer/[session_id]/check-bill  → เรียกเช็คบิล
// DELETE /api/customer/[session_id]/check-bill  → ยกเลิกการเรียกเช็คบิล
//
// แก้ A7.3: เดิมหน้าลูกค้า UPDATE ตาราง tables ตรงๆ ด้วย anon key
//           = ใครก็พลิกสถานะโต๊ะไหนก็ได้ทั้งร้าน
// ตอนนี้เขียนได้เฉพาะโต๊ะที่ผูกกับ session และเฉพาะเมื่อโต๊ะนั้นมีบิลเปิดอยู่จริง
// =============================================================

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
    // บิลถูกปิดไปแล้วระหว่างนั้น — ไม่ใช่ error
    return Response.json({ tableStatus: null, orderActive: false });
  }

  const { error } = await supabaseAdmin
    .from('tables')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', tableId);

  if (error) throw error;

  return Response.json({ tableStatus: next, orderActive: true });
}

export async function POST(_request: Request, ctx: RouteContext<'/api/customer/[session_id]/check-bill'>) {
  try {
    const { session_id: sessionId } = await ctx.params;
    return await setTableStatus(sessionId, 'checking_out');
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<'/api/customer/[session_id]/check-bill'>) {
  try {
    const { session_id: sessionId } = await ctx.params;
    return await setTableStatus(sessionId, 'occupied');
  } catch (err) {
    return errorResponse(err);
  }
}
