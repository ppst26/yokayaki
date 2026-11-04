// =============================================================
// สคริปต์สำหรับรัน Migration ทั้งชุดขึ้น Supabase Database เปล่า (เช่น สาขาใหม่)
//
// วิธีใช้:
//   node scripts/migrate-fresh-db.mjs "<SUPABASE_DB_URL>"
//   node scripts/migrate-fresh-db.mjs "<SUPABASE_DB_URL>" --from 20260940_link_superadmin_user.sql
// =============================================================

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const dbArg = args.find(a => !a.startsWith('--'));
let rawUrl = dbArg || process.env.SUPABASE_DB_URL;

if (!rawUrl) {
  console.error('\n❌ กรุณาระบุ Connection String ของฐานข้อมูล Supabase:');
  console.error('   node scripts/migrate-fresh-db.mjs "<SUPABASE_DB_URL>"\n');
  process.exit(1);
}

// ตรวจสอบและ encode อักขระพิเศษในรหัสผ่านอัตโนมัติ (เช่น #, ?, /)
let dbUrl = rawUrl;
const urlMatch = rawUrl.match(/^(postgresql:\/\/[^:]+:)(.*)(@[^@]+)$/);
if (urlMatch) {
  const [, prefix, pass, suffix] = urlMatch;
  if (/[#?\/]/.test(pass) && !pass.includes('%')) {
    dbUrl = `${prefix}${encodeURIComponent(pass)}${suffix}`;
  }
}

// ตรวจสอบตัวเลือก --from
let fromFile = null;
const fromIndex = args.indexOf('--from');
if (fromIndex !== -1 && args[fromIndex + 1]) {
  fromFile = args[fromIndex + 1];
} else {
  const fromEq = args.find(a => a.startsWith('--from='));
  if (fromEq) fromFile = fromEq.split('=')[1];
}

const migrationsDir = resolve(process.cwd(), 'supabase/migrations');
let files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

if (fromFile) {
  const startIndex = files.findIndex(f => f.includes(fromFile));
  if (startIndex !== -1) {
    console.log(`⏩ ข้ามไฟล์ก่อนหน้า เริ่มรันตั้งแต่: ${files[startIndex]}`);
    files = files.slice(startIndex);
  } else {
    console.warn(`⚠️ ไม่พบไฟล์ที่ตรงกับ --from ${fromFile} จะเริ่มตั้งแต่ไฟล์แรก`);
  }
}

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
