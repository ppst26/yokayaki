import { parseJsonBody } from '@/lib/api/parse';
import { r2DeleteBodySchema } from '@/lib/api/schemas';
import { deleteObjectByUrl, isOurPublicUrl } from '@/lib/r2';
import { errorResponse, requireOwner } from '@/lib/session';

// =============================================================
// POST /api/uploads/delete
// Owner ลบ object บน R2 — เฉพาะ URL ที่เป็นของเรา
// =============================================================

export async function POST(request: Request) {
  try {
    await requireOwner();

    const body = await parseJsonBody(request, r2DeleteBodySchema);
    if (body instanceof Response) return body;

    if (!isOurPublicUrl(body.url)) {
      return Response.json({ error: 'URL ไม่ใช่ของเรา' }, { status: 400 });
    }

    const result = await deleteObjectByUrl(body.url);
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
