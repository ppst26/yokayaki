import 'server-only';
import { createClient } from '@supabase/supabase-js';

// =============================================================
// Supabase client ฝั่ง server เท่านั้น — ถือ service-role key ซึ่ง bypass RLS
//
// ⚠️ ห้าม import ไฟล์นี้จาก Client Component เด็ดขาด
//    `server-only` จะทำให้ build พังทันทีถ้าเผลอ import ผิดฝั่ง
// =============================================================

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ตั้งใจให้ throw ตอน import — ห้าม fallback เงียบๆ แบบเดิม (A7.8)
// ระบบที่บูตขึ้นมาโดยต่อ DB ไม่ได้ อันตรายกว่าระบบที่บูตไม่ขึ้น
if (!url) {
  throw new Error('[supabaseAdmin] ไม่พบ NEXT_PUBLIC_SUPABASE_URL');
}
if (!serviceRoleKey) {
  throw new Error('[supabaseAdmin] ไม่พบ SUPABASE_SERVICE_ROLE_KEY (ต้องไม่ขึ้นต้นด้วย NEXT_PUBLIC_)');
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
