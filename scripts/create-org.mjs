// =============================================================
// สร้าง organization ใหม่พร้อม seed ขั้นต่ำ (โต๊ะ 4 ใบ + เมนูจาก default org + owner)
//
//   node scripts/create-org.mjs <name> <slug> <owner-pin>
//
// ⚠️ PIN จะปรากฏใน shell history — ใช้สำหรับ test/staging เท่านั้น
// =============================================================
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { loadEnv, requireEnv } from './_env.mjs';

const DEFAULT_ORG = '00000000-0000-4000-8000-000000000001';

const env = loadEnv();
requireEnv(env, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const [name, slug, pin] = process.argv.slice(2);

if (!name?.trim() || !slug?.trim() || !pin) {
  console.error('ใช้: node scripts/create-org.mjs <name> <slug> <owner-pin>');
  process.exit(1);
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error('slug ต้องเป็นตัวพิมพ์เล็ก a-z, 0-9, ขีดกลาง — เริ่มด้วยตัวอักษรหรือเลข');
  process.exit(1);
}

if (!/^\d{6}$/.test(pin)) {
  console.error('PIN ต้องเป็นตัวเลข 6 หลัก');
  process.exit(1);
}

const orgName = name.trim();
const orgSlug = slug.trim();

const { data: org, error: orgError } = await db
  .from('organizations')
  .insert({ name: orgName, slug: orgSlug })
  .select('id')
  .single();

if (orgError) {
  console.error('สร้าง organization ไม่สำเร็จ:', orgError.message);
  process.exit(1);
}

const orgId = org.id;

const { error: settingsError } = await db.from('org_settings').insert({
  org_id: orgId,
  receipt_merchant_name: orgName,
});

if (settingsError) {
  console.error('สร้าง org_settings ไม่สำเร็จ:', settingsError.message);
  process.exit(1);
}

const tableRows = [1, 2, 3, 4].map((n) => ({
  org_id: orgId,
  table_number: n,
  status: 'vacant',
}));

const { error: tablesError } = await db.from('tables').insert(tableRows);

if (tablesError) {
  console.error('สร้างโต๊ะไม่สำเร็จ:', tablesError.message);
  process.exit(1);
}

// เดียวกับ lib/pinLookup.ts — ไม่ใส่ก็ยังใช้ได้ แค่ล็อกอินครั้งแรกจะไปทางเดินสำรอง
const pepper = env.PIN_LOOKUP_PEPPER?.trim();
const pinLookup = pepper ? createHmac('sha256', pepper).update(pin).digest('hex') : null;

const { data: ownerId, error: ownerError } = await db.rpc('admin_add_employee', {
  p_name: orgName,
  p_pin: pin,
  p_role: 'owner',
  p_org_id: orgId,
  p_pin_lookup: pinLookup,
});

if (ownerError) {
  console.error('สร้าง owner ไม่สำเร็จ:', ownerError.message);
  process.exit(1);
}
if (ownerId === -1) {
  console.error('สร้าง owner ไม่สำเร็จ: PIN นี้ถูกใช้แล้ว');
  process.exit(1);
}
if (!Number.isInteger(ownerId) || ownerId <= 0) {
  console.error('สร้าง owner ไม่สำเร็จ:', ownerId);
  process.exit(1);
}

const { data: menuItems, error: menuSelectError } = await db
  .from('menu_items')
  .select(
    'name, price, stock, is_happy_hour, happy_hour_price, is_stock_tracked, category, image_url, unit'
  )
  .eq('org_id', DEFAULT_ORG);

if (menuSelectError) {
  console.error('ดึงเมนูจาก default org ไม่สำเร็จ:', menuSelectError.message);
  process.exit(1);
}

if (menuItems?.length) {
  const copied = menuItems.map((item) => ({ ...item, org_id: orgId }));
  const { error: menuInsertError } = await db.from('menu_items').insert(copied);

  if (menuInsertError) {
    console.error('คัดลอกเมนูไม่สำเร็จ:', menuInsertError.message);
    process.exit(1);
  }
}

console.log(`✓ สร้าง org สำเร็จ`);
console.log(`  org_id:     ${orgId}`);
console.log(`  slug:       ${orgSlug}`);
console.log(`  owner_id:   ${ownerId}`);
console.log(`  tables:     4 (table_number 1–4)`);
console.log(`  menu_items: ${menuItems?.length ?? 0} รายการ (คัดลอกจาก default org)`);
