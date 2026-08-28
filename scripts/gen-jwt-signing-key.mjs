// สร้าง ES256 private/public JWK สำหรับเซ็น staff JWT
//
//   node scripts/gen-jwt-signing-key.mjs
//
// 1. คัดลอก PUBLIC JWK ไป import ที่ Supabase Dashboard
//    → Project Settings → API → JWT Signing Keys → Import key
// 2. ใส่ PRIVATE JWK (บรรทัดเดียว) ใน .env.local:
//    SUPABASE_JWT_SIGNING_JWK={"kty":"EC",...}
// 3. รีสตาร์ท dev server แล้วล็อกอินใหม่
import { generateKeyPair, exportJWK } from 'jose';
import { randomUUID } from 'node:crypto';

const kid = randomUUID();
const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });

const privateJwk = await exportJWK(privateKey);
const publicJwk = await exportJWK(publicKey);

Object.assign(privateJwk, {
  kid,
  alg: 'ES256',
  use: 'sig',
  key_ops: ['sign'],
  ext: true,
});
Object.assign(publicJwk, {
  kid,
  alg: 'ES256',
  use: 'sig',
  key_ops: ['verify'],
  ext: true,
});

console.log('=== PUBLIC JWK (import ใน Supabase Dashboard → JWT Signing Keys) ===\n');
console.log(JSON.stringify(publicJwk, null, 2));

console.log('\n=== PRIVATE JWK → ใส่ใน .env.local (ห้าม commit) ===\n');
console.log(`SUPABASE_JWT_SIGNING_JWK=${JSON.stringify(privateJwk)}`);

console.log('\nหมายเหตุ: หลัง import public key จะอยู่ใน JWKS (standby) — PostgREST ยอมรับทันที');
console.log('kid ต้องตรงกัน:', kid);
