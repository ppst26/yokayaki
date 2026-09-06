import { readOrgAuthCookie } from '@/lib/orgAuthCookie';

// =============================================================
// GET /api/auth/org-session — ตรวจว่า org cookie ยัง valid
// =============================================================

export async function GET() {
  if (process.env.M5_ORG_AUTH_SKIP === 'true') {
    return Response.json({ authenticated: true, orgId: null, skip: true });
  }

  const claims = await readOrgAuthCookie();
  if (!claims) {
    return Response.json({ authenticated: false, orgId: null });
  }

  return Response.json({
    authenticated: true,
    orgId: claims.orgId,
  });
}
