import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/authToken';
import { HttpError } from '@/lib/session';

// =============================================================
// Supabase client ที่ยิง RPC ด้วย JWT พนักงานจาก cookie
//
// ใช้เมื่อ RPC อ่าน jwt_emp_id() / jwt_emp_name() (void_order_item)
// หรือต้องผ่าน RLS ของ authenticated (order_items UPDATE, loyalty INSERT)
// =============================================================

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('[supabaseStaff] ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabaseUrl = url;
const supabaseAnonKey = anonKey;

export async function requireStaffSupabase(): Promise<SupabaseClient<Database>> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
