import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { getStaffToken, onStaffTokenChange } from '@/lib/staffToken';

// =============================================================
// Supabase client ฝั่งเบราว์เซอร์ — ใช้เฉพาะหน้าจอพนักงาน
//
// หน้าลูกค้า (/customer/[session_id]) ไม่ import ไฟล์นี้แล้ว
// ทุกอย่างที่หน้านั้นต้องใช้ผ่าน /api/customer/[session_id]/* แทน
//
// anon key ยังอยู่ใน bundle ของฝั่งพนักงาน (เลี่ยงไม่ได้) แต่หลัง migration
// 20260824_security_hardening ตัว anon role ไม่มี policy และไม่มี grant เหลืออยู่เลย
// → ตัว key เพียงอย่างเดียวเปิดอะไรไม่ได้
//
// สิ่งที่เปิดสิทธิ์จริงคือ JWT ที่ server เซ็นให้หลังตรวจ PIN ผ่าน
// =============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// เดิม fallback เป็น 'placeholder.supabase.co' ทำให้ build ผ่านและบูตขึ้นทั้งที่ต่อ DB ไม่ได้ (A7.8)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] ต้องตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env.local'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  // โหมด third-party auth ของ supabase-js — ใช้ token นี้ทั้ง PostgREST และ Realtime
  accessToken: async () => getStaffToken(),
});

// token อาจถูกตั้งไปแล้วก่อนไฟล์นี้จะถูกโหลด — onStaffTokenChange จะเรียกกลับทันทีด้วยค่าปัจจุบัน
onStaffTokenChange(token => {
  try {
    void supabase.realtime.setAuth(token ?? undefined);
  } catch (err) {
    console.error('[supabase] ตั้ง token ให้ realtime ไม่สำเร็จ', err);
  }
});

export { getStaffToken };
