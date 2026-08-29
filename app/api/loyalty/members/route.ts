import { requireStaff, errorResponse } from '@/lib/session';
import { requireStaffSupabase } from '@/lib/supabaseStaff';
import { parseJsonBody } from '@/lib/api/parse';
import { loyaltyMemberBodySchema } from '@/lib/api/schemas';

// =============================================================
// POST /api/loyalty/members — สมัครสมาชิกใหม่ตอนเช็คบิล
// =============================================================

export async function POST(request: Request) {
  try {
    await requireStaff();

    const body = await parseJsonBody(request, loyaltyMemberBodySchema);
    if (body instanceof Response) return body;

    const staffDb = await requireStaffSupabase();

    const { data: existing } = await staffDb
      .from('loyalty_members')
      .select('*')
      .eq('phone_number', body.phoneNumber)
      .maybeSingle();

    if (existing) {
      return Response.json({ member: existing, alreadyExists: true });
    }

    const { data: created, error } = await staffDb
      .from('loyalty_members')
      .insert({ phone_number: body.phoneNumber, name: body.name, points: 0 })
      .select('*')
      .single();

    if (error) throw error;

    return Response.json({ member: created, alreadyExists: false }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
