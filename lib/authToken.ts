import 'server-only';
import { SignJWT, jwtVerify, importJWK, type KeyLike } from 'jose';

// =============================================================
// JWT ของพนักงาน — สำหรับ PostgREST / Realtime (role authenticated)
//
// โปรเจกต์ที่ migrate ไป JWT Signing Keys (ES256) แล้วจะไม่ยอมรับ HS256
// → ใช้ SUPABASE_JWT_SIGNING_JWK (private JWK ที่ import คู่กับ public ใน Dashboard)
// โปรเจกต์ legacy ยังใช้ SUPABASE_JWT_SECRET (HS256) ได้
// =============================================================

export const SESSION_COOKIE = 'yk_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 1 กะ

export type EmployeeRole = 'owner' | 'staff';

export interface StaffClaims {
  empId: number;
  empName: string;
  empRole: EmployeeRole;
}

interface SigningMaterial {
  key: KeyLike;
  alg: string;
  kid?: string;
}

let signingMaterialPromise: Promise<SigningMaterial> | null = null;

async function loadSigningMaterial(): Promise<SigningMaterial> {
  const jwkRaw = process.env.SUPABASE_JWT_SIGNING_JWK?.trim();
  if (jwkRaw) {
    const jwk = JSON.parse(jwkRaw) as JsonWebKey & { alg?: string; kid?: string };
    const alg = jwk.alg ?? 'ES256';
    const key = await importJWK(jwk, alg);
    if (!key) {
      throw new Error('[authToken] อ่าน SUPABASE_JWT_SIGNING_JWK ไม่สำเร็จ');
    }
    if (!jwk.kid) {
      throw new Error('[authToken] SUPABASE_JWT_SIGNING_JWK ต้องมี kid (ตรงกับตอน import ใน Dashboard)');
    }
    return { key, alg, kid: jwk.kid };
  }

  const secretRaw = process.env.SUPABASE_JWT_SECRET;
  if (!secretRaw) {
    throw new Error(
      '[authToken] ต้องตั้ง SUPABASE_JWT_SIGNING_JWK (ES256 — โปรเจกต์ใหม่) หรือ SUPABASE_JWT_SECRET (legacy HS256)'
    );
  }
  return {
    key: new TextEncoder().encode(secretRaw),
    alg: 'HS256',
  };
}

function getSigningMaterial(): Promise<SigningMaterial> {
  if (!signingMaterialPromise) {
    signingMaterialPromise = loadSigningMaterial();
  }
  return signingMaterialPromise;
}

/** แปลง employee id เป็น UUID คงที่สำหรับ claim sub */
function employeeUuid(id: number): string {
  return `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`;
}

export async function signStaffToken(claims: StaffClaims): Promise<string> {
  const { key, alg, kid } = await getSigningMaterial();

  const header: { alg: string; typ: string; kid?: string } = { alg, typ: 'JWT' };
  if (kid) header.kid = kid;

  return new SignJWT({
    role: 'authenticated',
    emp_id: claims.empId,
    emp_name: claims.empName,
    emp_role: claims.empRole,
  })
    .setProtectedHeader(header)
    .setSubject(employeeUuid(claims.empId))
    .setAudience('authenticated')
    .setIssuer('yokayaki-pos')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

export async function verifyStaffToken(token: string): Promise<StaffClaims | null> {
  try {
    const { key } = await getSigningMaterial();
    const { payload } = await jwtVerify(token, key, {
      audience: 'authenticated',
      issuer: 'yokayaki-pos',
    });

    const empId = payload.emp_id;
    const empRole = payload.emp_role;
    const empName = payload.emp_name;

    if (typeof empId !== 'number') return null;
    if (empRole !== 'owner' && empRole !== 'staff') return null;

    return {
      empId,
      empName: typeof empName === 'string' ? empName : '',
      empRole,
    };
  } catch {
    return null;
  }
}
