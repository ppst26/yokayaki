// =============================================================
// Deploy migrations บน Supabase production (M0 → M2)
//
//   node scripts/deploy-production.mjs              # migrate + verify-lockdown
//   node scripts/deploy-production.mjs --verify-only
//   node scripts/deploy-production.mjs --check
//
// ต้องมีใน .env.local: NEXT_PUBLIC_SUPABASE_* · SUPABASE_SERVICE_ROLE_KEY ·
//   SUPABASE_JWT_SECRET · SUPABASE_DB_URL
// =============================================================
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { loadEnv, requireEnv } from './_env.mjs';

const MIGRATIONS = [
  { file: '20260824_security_hardening.sql', check: "SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_active_order_per_table')" },
  { file: '20260825_pin_lockout_hardening.sql', check: "SELECT NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'pin_hash')" },
  { file: '20260826_order_price_server_side.sql', check: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'place_order_item' AND pronargs = 4)" },
  { file: '20260827_checkout_server_side.sql', check: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'complete_checkout' AND pronargs = 5)" },
  { file: '20260828_audit_and_integrity.sql', check: "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'void_logs' AND column_name = 'reason_code')" },
  { file: '20260829_order_batch_rpc.sql', check: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'place_order_batch')" },
  { file: '20260830_performance_indexes.sql', check: "SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_items_order_id')" },
  { file: '20260831_sprint_c_pos_menu.sql', check: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'menu_item_sale_price')" },
  { file: '20260832_sprint_d_promo_stock_loyalty.sql', check: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'upsert_purchase_order')" },
  { file: '20260833_sprint_f_drop_discount_applied.sql', check: "SELECT NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'discount_applied')" },
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
  const psqlArgs = [dbUrl, '-v', 'ON_ERROR_STOP=1', '--no-psqlrc', '--quiet'];
  if (file) psqlArgs.push('-f', queryOrFile);
  else psqlArgs.push('-c', queryOrFile);
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

function isApplied(checkQuery) {
  return psqlScalar(checkQuery) === 't';
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
    return false;
  }
  console.log('✓ ไม่มีบิล active ซ้ำต่อโต๊ะ');

  const empCount = psqlScalar('SELECT COUNT(*) FROM employees');
  console.log(`✓ พนักงานในระบบ: ${empCount} คน`);

  const pending = MIGRATIONS.filter(m => !isApplied(m.check));
  console.log(`· migration ค้าง: ${pending.length}/${MIGRATIONS.length}`);
  return true;
}

function applyMigrations() {
  let ran = 0;
  for (const { file, check } of MIGRATIONS) {
    if (isApplied(check)) {
      console.log(`  skip ${file}`);
      continue;
    }
    const path = `supabase/migrations/${file}`;
    if (!existsSync(path)) {
      console.error(`ไม่พบ ${path}`);
      return false;
    }
    console.log(`→ ${file}`);
    if (!psql(path, { file: true })) {
      console.error(`✗ ล้มเหลวที่ ${file}`);
      return false;
    }
    ran += 1;
  }
  console.log(`\n✓ migration สำเร็จ (รันใหม่ ${ran} ไฟล์)`);
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

console.log(`Supabase: ${env.NEXT_PUBLIC_SUPABASE_URL}\n`);

if (!checkPreDeploy()) process.exit(1);
if (checkOnly) process.exit(0);

if (!verifyOnly) {
  if (!applyMigrations()) process.exit(1);
}

const ok = runVerifyLockdown();
if (!ok) {
  console.error('\n✗ verify-lockdown ยังไม่ผ่าน');
  process.exit(1);
}

console.log('\n✓ production deploy สำเร็จ (migration + verify-lockdown ผ่าน)');
