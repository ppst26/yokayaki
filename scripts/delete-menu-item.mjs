// =============================================================
// ลบเมนูจาก menu_items พร้อม cascade ลบ order ที่ผูกอยู่ทั้งหมด
//
//   node scripts/delete-menu-item.mjs "อากามิ"
//   node scripts/delete-menu-item.mjs --id 5
//
// ⚠️ อันตราย — ลบข้อมูลจริงจาก production ไม่สามารถกู้คืนได้
// =============================================================
import { createClient } from '@supabase/supabase-js';
import { loadEnv, requireEnv } from './_env.mjs';

const env = loadEnv();
requireEnv(env, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------- parse args ----------
const args = process.argv.slice(2);
let menuItemId = null;
let menuName = null;

if (args[0] === '--id') {
  menuItemId = Number(args[1]);
  if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
    console.error('id ต้องเป็นจำนวนเต็มบวก');
    process.exit(1);
  }
} else if (args[0]) {
  menuName = args[0];
} else {
  console.error('ใช้: node scripts/delete-menu-item.mjs "ชื่อเมนู"');
  console.error('     node scripts/delete-menu-item.mjs --id <menu_item_id>');
  process.exit(1);
}

// ---------- 1. หาเมนูที่ต้องลบ ----------
let query = db.from('menu_items').select('id, name, price');
if (menuItemId) {
  query = query.eq('id', menuItemId);
} else {
  query = query.eq('name', menuName);
}
const { data: items, error: itemErr } = await query;
if (itemErr) { console.error('หา menu_items ไม่ได้:', itemErr.message); process.exit(1); }
if (!items || items.length === 0) {
  console.error(`❌ ไม่พบเมนู "${menuName ?? menuItemId}"`);
  process.exit(1);
}
if (items.length > 1) {
  console.error(`❌ พบเมนูชื่อนี้มากกว่า 1 รายการ — ใช้ --id แทน:`);
  for (const i of items) console.error(`   id=${i.id}  ${i.name}  ${i.price}฿`);
  process.exit(1);
}

const item = items[0];
console.log(`\nกำลังลบเมนู: id=${item.id}  "${item.name}"  ${item.price}฿\n`);

// ---------- 2. หา order_items ที่ผูกอยู่ ----------
const { data: orderItems, error: oiErr } = await db
  .from('order_items')
  .select('id, order_id, quantity, status')
  .eq('menu_item_id', item.id);
if (oiErr) { console.error('หา order_items ไม่ได้:', oiErr.message); process.exit(1); }

const orderIds = [...new Set((orderItems ?? []).map(oi => oi.order_id))];
console.log(`  order_items ที่ผูกอยู่: ${(orderItems ?? []).length} รายการ`);
console.log(`  orders ที่เกี่ยวข้อง: ${orderIds.length} ใบ (ids: ${orderIds.join(', ') || '—'})`);

if (orderIds.length > 0) {
  // ---------- 3. ลบ payment_promotions → payments ของ orders เหล่านี้ ----------
  const { data: payments } = await db
    .from('payments')
    .select('id')
    .in('order_id', orderIds);
  const paymentIds = (payments ?? []).map(p => p.id);

  if (paymentIds.length > 0) {
    const { error: ppErr } = await db
      .from('payment_promotions')
      .delete()
      .in('payment_id', paymentIds);
    if (ppErr) { console.error('ลบ payment_promotions ไม่ได้:', ppErr.message); process.exit(1); }
    console.log(`  ลบ payment_promotions: ${paymentIds.length} payment(s)`);

    const { error: payErr } = await db
      .from('payments')
      .delete()
      .in('order_id', orderIds);
    if (payErr) { console.error('ลบ payments ไม่ได้:', payErr.message); process.exit(1); }
    console.log(`  ลบ payments: ${paymentIds.length} รายการ`);
  }

  // ---------- 4. ลบ order_items ทั้งหมดใน orders เหล่านี้ (ไม่ใช่แค่ของเมนูนี้) ----------
  const { error: oiDelErr, count: oiCount } = await db
    .from('order_items')
    .delete()
    .in('order_id', orderIds);
  if (oiDelErr) { console.error('ลบ order_items ไม่ได้:', oiDelErr.message); process.exit(1); }
  console.log(`  ลบ order_items ใน orders เหล่านี้ทั้งหมด`);

  // ---------- 5. ลบ orders ----------
  const { error: ordDelErr } = await db
    .from('orders')
    .delete()
    .in('id', orderIds);
  if (ordDelErr) { console.error('ลบ orders ไม่ได้:', ordDelErr.message); process.exit(1); }
  console.log(`  ลบ orders: ${orderIds.length} ใบ`);
}

// ---------- 6. ลบ menu_items ----------
const { error: miErr } = await db
  .from('menu_items')
  .delete()
  .eq('id', item.id);
if (miErr) { console.error('ลบ menu_items ไม่ได้:', miErr.message); process.exit(1); }

console.log(`\n✅ ลบเมนู "${item.name}" (id=${item.id}) พร้อมข้อมูลที่เกี่ยวข้องทั้งหมดเรียบร้อย\n`);
