import 'server-only';
import { cookies } from 'next/headers';
import { signAuxToken, verifyAuxToken } from '@/lib/authToken';

// =============================================================
// Cookie ยืนยันตัวตนระดับองค์กร (Supabase Auth) — ก่อน PIN shift login
// =============================================================

export const ORG_AUTH_COOKIE = 'yk_org_auth';
export const ORG_AUTH_TTL_SECONDS = 24 * 60 * 60; // 24 ชม.

const ORG_AUTH_ISSUER = 'yokayaki-org';
const ORG_AUTH_AUDIENCE = 'yokayaki-org-auth';

export interface OrgAuthClaims {
  authUserId: string;
  orgId: string;
}

function cookieFlags(maxAge: number, token = ''): string {
  return [
    `${ORG_AUTH_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

/** คืนค่า Set-Cookie header สำหรับตั้ง org session */
export async function setOrgAuthCookie(claims: OrgAuthClaims): Promise<string> {
  const token = await signAuxToken(
    { auth_user_id: claims.authUserId, org_id: claims.orgId },
    {
      issuer: ORG_AUTH_ISSUER,
      audience: ORG_AUTH_AUDIENCE,
      ttlSeconds: ORG_AUTH_TTL_SECONDS,
    },
  );
  return cookieFlags(ORG_AUTH_TTL_SECONDS, token);
}

/** อ่าน org session จาก cookie httpOnly */
export async function readOrgAuthCookie(): Promise<OrgAuthClaims | null> {
  const store = await cookies();
  const token = store.get(ORG_AUTH_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyAuxToken(token, {
    issuer: ORG_AUTH_ISSUER,
    audience: ORG_AUTH_AUDIENCE,
  });
  if (!payload) return null;

  const authUserId = payload.auth_user_id;
  const orgId = payload.org_id;
  if (typeof authUserId !== 'string' || !authUserId) return null;
  if (typeof orgId !== 'string' || !orgId) return null;

  return { authUserId, orgId };
}

/** คืนค่า Set-Cookie header สำหรับล้าง org session */
export function clearOrgAuthCookie(): string {
  return cookieFlags(0);
}
