// =============================================================
// ผูกพนักงาน (owner คนแรก) กับ Supabase Auth user
//
//   node scripts/link-owner-auth.mjs <employee_id> <auth_user_uuid>
//
// ทำ: UPDATE employees.auth_user_id + INSERT/UPDATE memberships
// =============================================================
import { createClient } from '@supabase/supabase-js';
import { loadEnv, requireEnv } from './_env.mjs';

const env = loadEnv();
requireEnv(env, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const [employeeIdArg, authUserIdArg] = process.argv.slice(2);

if (!employeeIdArg || !authUserIdArg) {
  console.error('ใช้: node scripts/link-owner-auth.mjs <employee_id> <auth_user_uuid>');
  process.exit(1);
}

const employeeId = Number(employeeIdArg);
if (!Number.isInteger(employeeId) || employeeId <= 0) {
  console.error('employee_id ต้องเป็นจำนวนเต็มบวก');
  process.exit(1);
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(authUserIdArg)) {
  console.error('auth_user_uuid ต้องเป็น UUID');
  process.exit(1);
}

const { data: emp, error: empErr } = await db
  .from('employees')
  .select('id, org_id, role, name, auth_user_id')
  .eq('id', employeeId)
  .single();

if (empErr || !emp) {
  console.error('ไม่พบพนักงาน:', empErr?.message ?? 'ไม่พบ');
  process.exit(1);
}

const { error: updateErr } = await db
  .from('employees')
  .update({ auth_user_id: authUserIdArg })
  .eq('id', employeeId);

if (updateErr) {
  console.error('อัปเดต employees.auth_user_id ไม่สำเร็จ:', updateErr.message);
  process.exit(1);
}

const { error: memErr } = await db.from('memberships').upsert(
  {
    auth_user_id: authUserIdArg,
    org_id: emp.org_id,
    employee_id: employeeId,
    role: emp.role,
  },
  { onConflict: 'auth_user_id,org_id' },
);

if (memErr) {
  console.error('สร้าง membership ไม่สำเร็จ:', memErr.message);
  process.exit(1);
}

console.log(`✓ ผูกพนักงาน id=${employeeId} (${emp.name}) กับ auth user ${authUserIdArg}`);
console.log(`  org_id=${emp.org_id} role=${emp.role}`);
