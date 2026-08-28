import 'server-only';
import type { z } from 'zod';

// =============================================================
// แปลง Zod safeParse → Response 400 หรือข้อมูลที่ผ่านแล้ว
// =============================================================

export function firstZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'ข้อมูลไม่ถูกต้อง';
  return issue.message || 'ข้อมูลไม่ถูกต้อง';
}

export function zodErrorResponse(error: z.ZodError): Response {
  return Response.json({ error: firstZodError(error) }, { status: 400 });
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<T | Response> {
  const raw = await request.json().catch(() => null);
  const result = schema.safeParse(raw);
  if (!result.success) return zodErrorResponse(result.error);
  return result.data;
}

export function parseValue<T>(raw: unknown, schema: z.ZodType<T>): T | Response {
  const result = schema.safeParse(raw);
  if (!result.success) return zodErrorResponse(result.error);
  return result.data;
}
