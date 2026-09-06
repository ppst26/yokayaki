import { clearOrgAuthCookie } from '@/lib/orgAuthCookie';

// =============================================================
// POST /api/auth/org-logout — ล้าง yk_org_auth cookie
// =============================================================

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.append('Set-Cookie', clearOrgAuthCookie());
  return response;
}
