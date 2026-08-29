// ทดสอบว่า staff JWT ที่แอปเซ็นถูก PostgREST ยอมรับ
import { readFileSync } from 'node:fs';
import { loadEnv, requireEnv } from './_env.mjs';
import { importJWK, SignJWT } from 'jose';

const env = loadEnv();
requireEnv(env, ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);

const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');

async function fetchJwksKids() {
  try {
    const res = await fetch(`${url}/auth/v1/.well-known/jwks.json`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.keys ?? []).map((k) => k.kid).filter(Boolean);
  } catch {
    return [];
  }
}

function readJwkRaw() {
  const jwkFile = env.SUPABASE_JWT_SIGNING_JWK_FILE?.trim();
  if (jwkFile) return readFileSync(jwkFile, 'utf8').trim();
  const inline = env.SUPABASE_JWT_SIGNING_JWK?.trim();
  if (inline) return inline.replace(/\s+/g, '');
  return null;
}

async function signTestToken() {
  const jwkRaw = readJwkRaw();
  if (jwkRaw) {
    const jwk = JSON.parse(jwkRaw);
    const alg = jwk.alg ?? 'ES256';
    const key = await importJWK({ ...jwk, key_ops: ['sign'] }, alg);
    const header = { alg, typ: 'JWT' };
    if (jwk.kid) header.kid = jwk.kid;
    return new SignJWT({
      role: 'authenticated',
      emp_id: 9,
      emp_name: 'test',
      emp_role: 'owner',
    })
      .setProtectedHeader(header)
      .setSubject('00000000-0000-4000-8000-000000000009')
      .setAudience('authenticated')
      .setIssuer('yokayaki-pos')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key);
  }

  if (!env.SUPABASE_JWT_SECRET) {
    throw new Error('ต้องมี SUPABASE_JWT_SIGNING_JWK หรือ SUPABASE_JWT_SECRET');
  }
  const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
  return new SignJWT({
    role: 'authenticated',
    emp_id: 9,
    emp_name: 'test',
    emp_role: 'owner',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject('00000000-0000-4000-8000-000000000009')
    .setAudience('authenticated')
    .setIssuer('yokayaki-pos')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

const token = await signTestToken();
const tokenHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
console.log('JWT header:', tokenHeader);

const jwksKids = await fetchJwksKids();
console.log('JWKS kids บน Supabase:', jwksKids.join(', ') || '(ว่าง)');
if (tokenHeader.kid && !jwksKids.includes(tokenHeader.kid)) {
  console.log('\n⚠ kid', tokenHeader.kid, 'ยังไม่อยู่ใน JWKS — ต้อง import PUBLIC key ก่อน');
  console.log('  รัน: node scripts/export-public-jwk.mjs');
  console.log('  แล้ว Dashboard → Project Settings → API → JWT Signing Keys → Import key');
}

const res = await fetch(`${url}/rest/v1/tables?select=id&limit=1`, {
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  },
});
const body = await res.text();
console.log(`PostgREST: ${res.status}`, body.slice(0, 200));

if (res.ok) {
  console.log('\n✓ staff JWT ใช้งานได้ — ล็อกอินใหม่ในแอปแล้วทดสอบ');
} else {
  console.log('\n✗ ยังไม่ผ่าน — ตรวจว่า import PUBLIC JWK ใน Dashboard แล้ว (kid ต้องตรง)');
}
