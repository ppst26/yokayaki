// =============================================================
// ที่เก็บ JWT ของพนักงาน — เก็บใน memory เท่านั้น
//
// โมดูลนี้ตั้งใจให้ "ไม่ import อะไรเลย" โดยเฉพาะ @/lib/supabase
// เพราะ AuthProvider อยู่ใน root layout ซึ่งครอบหน้าลูกค้าด้วย
// ถ้าโมดูลนี้ลาก supabase client เข้ามา anon key จะไปโผล่ใน chunk
// ที่หน้าลูกค้าต้องโหลด ทั้งที่หน้านั้นไม่ได้ใช้ supabase แล้ว
//
// ไม่เก็บลง localStorage — token ที่อยู่ข้าม reload คือ cookie httpOnly
// ซึ่ง JS อ่านไม่ได้ (ลด surface ของ XSS)
// =============================================================

let staffToken: string | null = null;

type TokenListener = (token: string | null) => void;
let listener: TokenListener | null = null;

export function getStaffToken(): string | null {
  return staffToken;
}

export function setStaffToken(token: string | null): void {
  staffToken = token;
  listener?.(token);
}

/**
 * ให้ supabase client มาลงทะเบียนตอนที่มันถูกโหลดจริง
 * (เรียกทันทีหนึ่งครั้งด้วยค่าปัจจุบัน เผื่อ login เกิดขึ้นก่อน client จะโหลด)
 */
export function onStaffTokenChange(fn: TokenListener): void {
  listener = fn;
  fn(staffToken);
}
