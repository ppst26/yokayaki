import { requireStaff, errorResponse, clientKeyFrom } from '@/lib/session';
import { requireStaffSupabase } from '@/lib/supabaseStaff';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseJsonBody } from '@/lib/api/parse';
import { checkoutBodySchema } from '@/lib/api/schemas';

// =============================================================
// POST /api/checkout — ปิดบิล (complete_checkout ใน DB)
// =============================================================

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();

    const limited = enforceRateLimit({
      key: `checkout:${staff.empId}:${clientKeyFrom(request)}`,
      max: 30,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const body = await parseJsonBody(request, checkoutBodySchema);
    if (body instanceof Response) return body;

    const staffDb = await requireStaffSupabase();

    const { data, error } = await staffDb.rpc('complete_checkout', {
      p_order_id: body.orderId,
      p_cash_received: body.cashReceived,
      p_coupon_code: body.couponCode,
      p_phone_number: body.phoneNumber,
      p_points_redeem: body.pointsRedeem,
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    return Response.json({ result });
  } catch (err) {
    return errorResponse(err);
  }
}
