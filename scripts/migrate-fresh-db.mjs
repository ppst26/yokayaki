// =============================================================
// สคริปต์สำหรับรัน Migration ทั้งชุดขึ้น Supabase Database เปล่า (เช่น สาขาใหม่)
//
// วิธีใช้:
//   node scripts/migrate-fresh-db.mjs "<SUPABASE_DB_URL>"
//
// ตัวอย่าง:
//   node scripts/migrate-fresh-db.mjs "postgresql://postgres.xxx:mypassword@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
// =============================================================

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const dbUrl = process.argv[2] || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('\n❌ กรุณาระบุ Connection String ของฐานข้อมูล Supabase:');
  console.error('   node scripts/migrate-fresh-db.mjs "<SUPABASE_DB_URL>"\n');
  process.exit(1);
}

const migrationsDir = resolve(process.cwd(), 'supabase/migrations');
const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`\n🚀 เริ่มต้นรัน Migration ทั้งหมด ${files.length} ไฟล์ขึ้น Supabase...`);
console.log(`📍 ปลายทาง: ${dbUrl.replace(/:([^:@]+)@/, ':****@')}\n`);

let successCount = 0;

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const filePath = join(migrationsDir, file);
  const progress = `[${String(i + 1).padStart(2)}/${files.length}]`;

  process.stdout.write(`⏳ ${progress} ${file} ... `);

  const res = spawnSync(
    'psql',
    [dbUrl, '-v', 'ON_ERROR_STOP=1', '--no-psqlrc', '--quiet', '-f', filePath],
    { encoding: 'utf8', shell: false }
  );

  if (res.status !== 0) {
    console.log('❌ ล้มเหลว!');
    if (res.stderr?.trim()) {
      console.error('\n' + res.stderr.trim() + '\n');
    }
    console.error(`\n⚠️ หยุดการทำงานที่ไฟล์: ${file}`);
    process.exit(1);
  }

  console.log('✅ สำเร็จ');
  successCount++;
}

console.log(`\n🎉 เสร็จสมบูรณ์! รัน Migration สำเร็จครบทั้ง ${successCount}/${files.length} ไฟล์\n`);
