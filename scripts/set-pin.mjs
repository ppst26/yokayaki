// =============================================================
// ตั้ง PIN ให้พนักงาน โดยไม่ต้องผ่านหน้าเว็บ
//
// ใช้ตอน deploy migration 20260824_security_hardening ซึ่งจะล้าง PIN ของบัญชี
// ที่ยังใช้ค่าจาก seed (owner = SHA-256 ของสตริงว่าง) ทิ้ง — ต้องตั้งใหม่ก่อนถึงจะล็อกอินได้
//
//   node scripts/set-pin.mjs --list
//   node scripts/set-pin.mjs <employee_id> <pin 6 หลัก>
//
// ⚠️ PIN จะปรากฏใน shell history — เปลี่ยนผ่านหน้าจัดการพนักงานทีหลังถ้ากังวล
// =============================================================
import { createClient } from '@supabase/supabase-js';
import { loadEnv, requireEnv } from './_env.mjs';

const env = loadEnv();
requireEnv(env, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const [arg1, arg2] = process.argv.slice(2);

if (!arg1 || arg1 === '--list') {
  const { data, error } = await db.rpc('admin_list_employees');
  if (error) {
    console.error('ดึงรายชื่อไม่สำเร็จ:', error.message);
    process.exit(1);
  }
  console.log('\nid  ตำแหน่ง  ตั้ง PIN แล้ว  ชื่อ');
  console.log('--  -------  ------------  ----');
  for (const e of data ?? []) {
    console.log(
      String(e.id).padEnd(3),
      e.role.padEnd(7),
      (e.has_pin ? 'ใช่' : '**ยังไม่ได้ตั้ง**').padEnd(12),
      e.name
    );
  }
  console.log('\nตั้ง PIN:  node scripts/set-pin.mjs <id> <pin 6 หลัก>\n');
  process.exit(0);
}

const employeeId = Number(arg1);
if (!Number.isInteger(employeeId) || employeeId <= 0) {
  console.error('employee_id ต้องเป็นจำนวนเต็มบวก');
  process.exit(1);
}
if (!/^\d{6}$/.test(arg2 ?? '')) {
  console.error('PIN ต้องเป็นตัวเลข 6 หลัก');
  process.exit(1);
}

const { data, error } = await db.rpc('admin_update_employee', {
  p_employee_id: employeeId,
  p_name: null,
  p_pin: arg2,
  p_role: null,
});

if (error) {
  console.error('ตั้ง PIN ไม่สำเร็จ:', error.message);
  process.exit(1);
}
if (data !== 'ok') {
  console.error('ตั้ง PIN ไม่สำเร็จ:', data);
  process.exit(1);
}

console.log(`✓ ตั้ง PIN ใหม่ให้พนักงาน id=${employeeId} เรียบร้อย`);
