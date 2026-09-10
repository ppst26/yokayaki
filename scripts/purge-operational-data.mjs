// =============================================================
// ล้างออเดอร์ / ประวัติการขาย / สถิติ — เก็บ menu_items ไว้
//
//   node scripts/purge-operational-data.mjs
//   node scripts/purge-operational-data.mjs --yes
//
// ต้องมี SUPABASE_DB_URL ใน .env.local (Session mode URI)
// =============================================================
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { loadEnv, requireEnv } from './_env.mjs';

const env = loadEnv();
requireEnv(env, ['SUPABASE_DB_URL']);

const autoConfirm = process.argv.includes('--yes');

if (!autoConfirm) {
  console.log('จะล้างข้อมูลต่อไปนี้:');
  console.log('  - orders, order_items, payments, payment_promotions');
  console.log('  - void_logs, stock_logs, qr_sessions');
  console.log('  - points_logs, purchase_orders, item_ingredients');
  console.log('  - login_audit, staff_sessions');
  console.log('  - รีเซ็ตแต้มสมาชิกเป็น 0 และสถานะโต๊ะเป็น vacant');
  console.log('');
  console.log('เก็บไว้: menu_items, promotions, employees, loyalty_members (ชื่อ)');
  console.log('');
  console.log('รันซ้ำด้วย: node scripts/purge-operational-data.mjs --yes');
  process.exit(0);
}

const sql = readFileSync('supabase/sql/purge_operational_history.sql', 'utf8');
const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL });

try {
  await client.connect();
  await client.query(sql);
  console.log('ล้างประวัติการทำรายการเรียบร้อย (เมนูยังอยู่)');
} catch (error) {
  console.error('ล้างข้อมูลไม่สำเร็จ:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
