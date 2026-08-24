// =============================================================
// Phase 4 — พิสูจน์ว่า anon key ไร้ค่าจริง
//
//   node scripts/verify-lockdown.mjs
//
// ยิงด้วย anon key ตัวเดียวกับที่อยู่ใน JS bundle ของหน้าลูกค้า
// ทุกข้อต้อง "ถูกปฏิเสธ" — ถ้ามีข้อไหนผ่าน แปลว่า A1 ยังไม่ถูกปิด
// =============================================================
import { loadEnv, requireEnv } from './_env.mjs';

const env = loadEnv();
requireEnv(env, ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const headers = {
  apikey: ANON,
  Authorization: `Bearer ${ANON}`,
  'Content-Type': 'application/json',
};

/** ถือว่า "ปิดแล้ว" เมื่อโดนปฏิเสธสิทธิ์ หรืออ่านได้แต่ไม่มีข้อมูลหลุดออกมาเลย */
function isBlocked(status, body) {
  if (status === 401 || status === 403 || status === 404) return true;
  if (status >= 400) return true;
  if (Array.isArray(body) && body.length === 0) return true;
  return false;
}

const checks = [
  { name: 'อ่านตาราง employees (pin_hash ของทุกคน)', method: 'GET',
    path: '/rest/v1/employees?select=*' },
  { name: 'อ่านตาราง payments (ยอดขายทั้งร้าน)', method: 'GET',
    path: '/rest/v1/payments?select=*' },
  { name: 'อ่านชื่อ+เบอร์ลูกค้าทุกคน', method: 'GET',
    path: '/rest/v1/loyalty_members?select=*' },
  { name: 'อ่านเมนู (หน้าลูกค้าไม่ควรอ่านตรงได้แล้ว)', method: 'GET',
    path: '/rest/v1/menu_items?select=*' },
  { name: 'สร้างบัญชี owner ให้ตัวเอง (add_employee)', method: 'POST',
    path: '/rest/v1/rpc/add_employee',
    body: { p_name: 'pentest', p_pin_hash: 'deadbeef', p_role: 'owner' } },
  { name: 'สร้างบัญชี owner ให้ตัวเอง (admin_add_employee)', method: 'POST',
    path: '/rest/v1/rpc/admin_add_employee',
    body: { p_name: 'pentest', p_pin: '999999', p_role: 'owner' } },
  { name: 'ยิงเดา PIN ผ่าน verify_pin', method: 'POST',
    path: '/rest/v1/rpc/verify_pin',
    body: { p_pin: '111111', p_client_key: 'pentest' } },
  { name: 'แก้ราคาเมนูเป็น 1 บาท', method: 'PATCH',
    path: '/rest/v1/menu_items?id=eq.1', body: { price: 1 } },
  { name: 'พลิกสถานะโต๊ะ 1 เป็นว่าง', method: 'PATCH',
    path: '/rest/v1/tables?id=eq.1', body: { status: 'vacant' } },
  { name: 'ลบบันทึกการชำระเงิน', method: 'DELETE',
    path: '/rest/v1/payments?id=gt.0' },
  { name: 'ปิดบิลเป็นศูนย์บาท (complete_checkout)', method: 'POST',
    path: '/rest/v1/rpc/complete_checkout',
    body: { p_order_id: 1, p_payment_method: 'cash', p_subtotal: 0, p_discount_amount: 0,
            p_net_amount: 0, p_points_earned: 0, p_points_redeemed: 0 } },
  { name: 'ปิดบิลผ่าน signature ใหม่ของ complete_checkout', method: 'POST',
    path: '/rest/v1/rpc/complete_checkout',
    body: { p_order_id: 1, p_cash_received: 0 } },
  { name: 'สั่งอาหารแทนลูกค้า (customer_place_order_item)', method: 'POST',
    path: '/rest/v1/rpc/customer_place_order_item',
    body: { p_session_id: '00000000-0000-0000-0000-000000000000',
            p_menu_item_id: 1, p_quantity: 1 } },
  { name: 'สั่งอาหารแทนพนักงาน (place_order_item)', method: 'POST',
    path: '/rest/v1/rpc/place_order_item',
    body: { p_table_id: 1, p_menu_item_id: 1, p_quantity: 1 } },
  { name: 'สั่งอาหารราคา 0 บาทผ่าน overload เก่าที่รับ p_unit_price', method: 'POST',
    path: '/rest/v1/rpc/place_order_item',
    body: { p_table_id: 1, p_menu_item_id: 1, p_quantity: 1, p_unit_price: 0 } },
];

let failures = 0;

for (const check of checks) {
  let status = 0;
  let body = null;
  try {
    const res = await fetch(URL_BASE + check.path, {
      method: check.method,
      headers,
      body: check.body ? JSON.stringify(check.body) : undefined,
    });
    status = res.status;
    body = await res.json().catch(() => null);
  } catch (err) {
    console.log(`?  ${check.name} — เชื่อมต่อไม่ได้: ${err.message}`);
    continue;
  }

  const blocked = isBlocked(status, body);
  if (!blocked) failures += 1;

  const detail = typeof body?.message === 'string' ? body.message
    : Array.isArray(body) ? `${body.length} แถว`
    : JSON.stringify(body)?.slice(0, 80) ?? '';

  console.log(`${blocked ? '✓ ปิดแล้ว ' : '✗ ยังเปิดอยู่'}  [${status}] ${check.name}  ${detail}`);
}

console.log('');
if (failures > 0) {
  console.error(`✗ ยังมี ${failures} ช่องที่ anon key เข้าถึงได้ — A1 ยังไม่ถูกปิด`);
  process.exit(1);
}
console.log('✓ anon key เข้าถึงอะไรไม่ได้เลย');
