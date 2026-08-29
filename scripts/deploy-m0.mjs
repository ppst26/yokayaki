// =============================================================
// ปิด M0 บน Supabase production
//
//   node scripts/deploy-m0.mjs              # รัน migration ชุด security แล้ว verify
//   node scripts/deploy-m0.mjs --verify-only  # ข้าม migration — verify อย่างเดียว
//   node scripts/deploy-m0.mjs --check        # ตรวจสภาพก่อน deploy
//
// ต้องมีใน .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_JWT_SECRET
//   SUPABASE_DB_URL          — Connection string (Session mode) จาก Dashboard → Database
// =============================================================
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { loadEnv, requireEnv } from './_env.mjs';

const M0_MIGRATIONS = [
  '20260824_security_hardening.sql',
  '20260825_pin_lockout_hardening.sql',
  '20260826_order_price_server_side.sql',
  '20260827_checkout_server_side.sql',
  '20260828_audit_and_integrity.sql',
];

const args = new Set(process.argv.slice(2));
const verifyOnly = args.has('--verify-only');
const checkOnly = args.has('--check');

const env = loadEnv();
requireEnv(env, [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'SUPABASE_DB_URL',
]);

const dbUrl = env.SUPABASE_DB_URL;

function psql(queryOrFile, { file = false } = {}) {
  const psqlArgs = [
    dbUrl,
    '-v', 'ON_ERROR_STOP=1',
    '--no-psqlrc',
    '--quiet',
  ];
  if (file) {
    psqlArgs.push('-f', queryOrFile);
  } else {
    psqlArgs.push('-c', queryOrFile);
  }
  const res = spawnSync('psql', psqlArgs, { encoding: 'utf8', shell: false });
  if (res.stdout?.trim()) console.log(res.stdout.trim());
  if (res.stderr?.trim()) console.error(res.stderr.trim());
  return res.status === 0;
}

function psqlScalar(query) {
  const res = spawnSync('psql', [
    dbUrl, '-v', 'ON_ERROR_STOP=1', '--no-psqlrc', '--quiet', '-t', '-A', '-c', query,
  ], { encoding: 'utf8', shell: false });
  if (res.status !== 0) {
    console.error(res.stderr?.trim() || 'psql failed');
    process.exit(1);
  }
  return (res.stdout ?? '').trim();
}

function migrationApplied() {
  const n = psqlScalar(
    "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_active_order_per_table'"
  );
  return Number(n) > 0;
}

function checkPreDeploy() {
  console.log('== ตรวจก่อน deploy ==\n');

  const dup = psqlScalar(`
    SELECT COALESCE(string_agg(t.table_id::TEXT, ', '), '')
    FROM (
      SELECT o.table_id FROM orders o WHERE o.status = 'active'
      GROUP BY o.table_id HAVING COUNT(*) > 1
    ) t
  `);
  if (dup) {
    console.error(`✗ โต๊ะที่มีบิล active ซ้ำ: table_id ${dup}`);
    console.error('  รวมหรือปิดบิลส่วนเกินก่อนรัน migration 20260828');
    return false;
  }
  console.log('✓ ไม่มีบิล active ซ้ำต่อโต๊ะ');

  const empCount = psqlScalar('SELECT COUNT(*) FROM employees');
  console.log(`✓ พนักงานในระบบ: ${empCount} คน`);

  if (migrationApplied()) {
    console.log('✓ migration M0 ดูเหมือนรันแล้ว (มี uniq_active_order_per_table)');
  } else {
    console.log('· migration M0 ยังไม่รัน');
  }

  return true;
}

function applyMigrations() {
  if (migrationApplied()) {
    console.log('ข้าม migration — ตรวจพบว่า M0 รันแล้ว');
    return true;
  }

  console.log('\n== รัน migration M0 (5 ไฟล์) ==\n');

  for (const name of M0_MIGRATIONS) {
    const path = `supabase/migrations/${name}`;
    if (!existsSync(path)) {
      console.error(`ไม่พบ ${path}`);
      return false;
    }
    console.log(`→ ${name}`);
    if (!psql(path, { file: true })) {
      console.error(`✗ ล้มเหลวที่ ${name}`);
      return false;
    }
  }

  console.log('\n✓ migration M0 สำเร็จ');
  return true;
}

function runVerifyLockdown() {
  console.log('\n== verify-lockdown (anon key) ==\n');
  const res = spawnSync('node', ['scripts/verify-lockdown.mjs'], {
    stdio: 'inherit',
    shell: false,
  });
  return res.status === 0;
}

function printPostDeploy() {
  console.log('\n== ขั้นตอนหลัง migration ==\n');
  console.log('1. ตั้ง PIN พนักงาน (หลัง migration บัญชี seed ถูกล้างแล้ว):');
  console.log('     node scripts/set-pin.mjs --list');
  console.log('     node scripts/set-pin.mjs <id> <pin 6 หลัก>');
  console.log('');
  console.log('2. Deploy แอป Next.js พร้อม env ใหม่ (ต้องมี SUPABASE_JWT_SECRET + SERVICE_ROLE_KEY บน host):');
  console.log('     pnpm build && deploy (Vercel / server ของคุณ)');
  console.log('');
  console.log('3. ทดสอบล็อกอิน PIN บน production');
  console.log('');
  console.log('4. อัปเดต MODULES_MILESTONES.md — ปิด M0 เมื่อ verify-lockdown ผ่านครบ');
}

// --- main ---
console.log(`Supabase: ${env.NEXT_PUBLIC_SUPABASE_URL}\n`);

if (!checkPreDeploy()) process.exit(1);
if (checkOnly) process.exit(0);

if (!verifyOnly) {
  if (!applyMigrations()) process.exit(1);
}

const ok = runVerifyLockdown();
printPostDeploy();

if (!ok) {
  console.error('\n✗ verify-lockdown ยังไม่ผ่าน — M0 ยังไม่ปิด');
  process.exit(1);
}

console.log('\n✓ M0 ปิดบน production แล้ว (migration + verify-lockdown ผ่าน)');
console.log('  อย่าลืมตั้ง PIN และ deploy แอปก่อนให้พนักงานใช้งาน');
