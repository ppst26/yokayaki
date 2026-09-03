import { parseJsonBody } from '@/lib/api/parse';
import { r2PresignBodySchema } from '@/lib/api/schemas';
import {
  mimeToExt,
  presignPut,
  R2_ALLOWED_MIMES,
  R2_MAX_UPLOAD_BYTES,
} from '@/lib/r2';
import { errorResponse, requireOwner } from '@/lib/session';

// =============================================================
// POST /api/uploads/presign
// Owner ขอ presigned PUT URL สำหรับอัปโหลดรูปเมนู/โปรโมชั่น
// =============================================================

export async function POST(request: Request) {
  try {
    await requireOwner();

    const body = await parseJsonBody(request, r2PresignBodySchema);
    if (body instanceof Response) return body;

    if (!R2_ALLOWED_MIMES.has(body.contentType)) {
      return Response.json({ error: 'ประเภทไฟล์ไม่รองรับ (รองรับ JPG, PNG, WebP)' }, { status: 400 });
    }

    if (body.contentLength > R2_MAX_UPLOAD_BYTES) {
      return Response.json({ error: 'ไฟล์ใหญ่เกิน 2 MB' }, { status: 400 });
    }

    const ext = mimeToExt(body.contentType);
    if (!ext) {
      return Response.json({ error: 'ประเภทไฟล์ไม่รองรับ (รองรับ JPG, PNG, WebP)' }, { status: 400 });
    }

    const key = `${body.folder}/${crypto.randomUUID()}.${ext}`;

    const result = await presignPut({
      folder: body.folder,
      key,
      contentType: body.contentType,
      contentLength: body.contentLength,
    });

    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
