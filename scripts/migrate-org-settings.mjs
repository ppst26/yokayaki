// =============================================================
// อัปเดต org_settings ของ default org จากค่าใน .env.local
//
//   node scripts/migrate-org-settings.mjs
//
// อ่าน NEXT_PUBLIC_PROMPTPAY_ID และ RECEIPT_MERCHANT_NAME แล้ว upsert
// ลง org 00000000-0000-4000-8000-000000000001
// =============================================================
import { createClient } from '@supabase/supabase-js';
import { loadEnv, requireEnv } from './_env.mjs';

const DEFAULT_ORG = '00000000-0000-4000-8000-000000000001';
const env = loadEnv();
requireEnv(env, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const promptpay = (env.NEXT_PUBLIC_PROMPTPAY_ID ?? '').replace(/[^0-9]/g, '') || null;
const merchant = env.RECEIPT_MERCHANT_NAME?.trim() || 'YOKAYAKI';

const { error } = await db.from('org_settings').upsert({
  org_id: DEFAULT_ORG,
  promptpay_id: promptpay,
  receipt_merchant_name: merchant,
});

if (error) {
  console.error('อัปเดต org_settings ไม่สำเร็จ:', error.message);
  process.exit(1);
}
console.log('อัปเดต default org_settings สำเร็จ');
