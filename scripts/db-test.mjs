// =============================================================
// รันชุดทดสอบความปลอดภัยกับ Postgres ใน docker
//
//   pnpm db:up && pnpm db:test
//
// ไฟล์ทดสอบอยู่ที่ supabase/tests/*.sql (mount เข้า container ที่ /tests)
// ทุกไฟล์รันใน transaction แล้ว ROLLBACK → รันซ้ำได้ ไม่ทิ้งขยะไว้ใน DB
// =============================================================
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const SERVICE = 'db';
const DB_USER = 'postgres';
const DB_NAME = 'yokayaki_test';

function compose(args, opts = {}) {
  return spawnSync('docker', ['compose', ...args], { stdio: 'inherit', shell: false, ...opts });
}

// ตรวจก่อนว่า container รันอยู่จริง — ไม่งั้น error ที่ได้จะงงมาก
const ps = spawnSync('docker', ['compose', 'ps', '--status=running', '--quiet', SERVICE], {
  encoding: 'utf8',
});
if (ps.status !== 0 || !ps.stdout.trim()) {
  console.error('ยังไม่ได้สตาร์ท Postgres สำหรับทดสอบ — รัน `pnpm db:up` ก่อน');
  process.exit(1);
}

const files = readdirSync('supabase/tests').filter(f => f.endsWith('.sql')).sort();
if (files.length === 0) {
  console.error('ไม่พบไฟล์ทดสอบใน supabase/tests');
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  console.log(`\n===== ${file} =====`);
  const res = compose([
    'exec', '-T', SERVICE,
    'psql', '-v', 'ON_ERROR_STOP=1', '--no-psqlrc', '--quiet',
    '-U', DB_USER, '-d', DB_NAME, '-f', `/tests/${file}`,
  ]);
  if (res.status !== 0) failed += 1;
}

if (failed > 0) {
  console.error(`\nไม่ผ่าน ${failed} ไฟล์`);
  process.exit(1);
}
console.log('\nผ่านครบทุกไฟล์');
