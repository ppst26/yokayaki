import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// =============================================================
// Supabase client ฝั่ง server เท่านั้น — ถือ service-role key ซึ่ง bypass RLS
//
// ⚠️ ห้าม import ไฟล์นี้จาก Client Component เด็ดขาด
//    `server-only` จะทำให้ build พังทันทีถ้าเผลอ import ผิดฝั่ง
// =============================================================

let client: SupabaseClient<Database> | null = null;

// สร้าง client ครั้งแรกที่มีการใช้งานจริง ไม่ใช่ตอน import
// build ของ Next.js ประเมิน module นี้ตอน collect page data ซึ่งยังไม่มี secret ให้ใช้
// แต่ยังห้าม fallback เงียบๆ (A7.8) — request แรกที่ env ไม่ครบต้องพังทันที
function getClient(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error('[supabaseAdmin] ไม่พบ NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    throw new Error('[supabaseAdmin] ไม่พบ SUPABASE_SERVICE_ROLE_KEY (ต้องไม่ขึ้นต้นด้วย NEXT_PUBLIC_)');
  }

  client = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const instance = getClient();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
