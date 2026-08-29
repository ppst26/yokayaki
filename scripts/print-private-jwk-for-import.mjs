// พิมพ์ private JWK เป็น JSON ที่ valid — คัดลอกไป paste ใน Supabase Import dialog
import { readFileSync, existsSync } from 'node:fs';
import { loadEnv } from './_env.mjs';

let obj;
if (existsSync('jwt-signing-key.private.json')) {
  obj = JSON.parse(readFileSync('jwt-signing-key.private.json', 'utf8'));
} else {
  const env = loadEnv();
  const raw = env.SUPABASE_JWT_SIGNING_JWK?.replace(/\s+/g, '');
  if (!raw) {
    console.error('ไม่พบ SUPABASE_JWT_SIGNING_JWK หรือ jwt-signing-key.private.json');
    process.exit(1);
  }
  obj = JSON.parse(raw);
}

console.log('=== คัดลอกทั้งก้อนด้านล่างไป paste ใน Supabase (ห้ามแตกบรรทัดกลางตัวเลข) ===\n');
console.log(JSON.stringify(obj, null, 2));
console.log('\nkid:', obj.kid);
