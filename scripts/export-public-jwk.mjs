// แสดง PUBLIC JWK จาก private ใน .env.local — ใช้ import ใน Dashboard
import { readFileSync } from 'node:fs';
import { loadEnv } from './_env.mjs';

const env = loadEnv();
let raw = env.SUPABASE_JWT_SIGNING_JWK?.replace(/\s+/g, '');
if (env.SUPABASE_JWT_SIGNING_JWK_FILE) {
  raw = readFileSync(env.SUPABASE_JWT_SIGNING_JWK_FILE, 'utf8').trim();
}
if (!raw) {
  console.error('ไม่พบ SUPABASE_JWT_SIGNING_JWK หรือ SUPABASE_JWT_SIGNING_JWK_FILE');
  process.exit(1);
}

const jwk = JSON.parse(raw);
delete jwk.d;
delete jwk.key_ops;
jwk.key_ops = ['verify'];
jwk.use = 'sig';
if (!jwk.alg) jwk.alg = 'ES256';

console.log('Import ใน Dashboard → JWT Signing Keys:\n');
console.log(JSON.stringify(jwk, null, 2));
console.log('\nkid:', jwk.kid);
