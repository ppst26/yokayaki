import 'server-only';
import { createHmac } from 'node:crypto';

// =============================================================
// ตัวช่วยหาแถวพนักงานจาก PIN โดยไม่ต้อง bcrypt ทั้งตาราง (PERF/1)
//
// verify_pin เดิมเทียบ `pin_bcrypt = crypt(p_pin, pin_bcrypt)` ซึ่ง index ไม่ได้
// → seq scan + bcrypt cost 10 ทุกแถว (~60-100 ms/แถว) = ล็อกอินช้าตามจำนวนพนักงาน
//
// ที่นี่คำนวณ HMAC-SHA256(pin, pepper) ส่งไปให้ DB ใช้เข้า index หาแถวเดียว
// แล้ว DB ค่อย bcrypt ครั้งเดียวเพื่อ "ตัดสิน" — ความแข็งแรงเท่าเดิม
//
// ⚠️ pepper ต้องอยู่แค่ใน env ของ server tier ห้ามเก็บลง DB
//    ไม่งั้น DB dump ที่หลุดจะพา pepper ไปด้วย แล้ว PIN 6 หลักถูกไล่ย้อนได้ทันที
// =============================================================

const pepper = process.env.PIN_LOOKUP_PEPPER?.trim();

let warned = false;

/**
 * คืน lookup hash ของ PIN — หรือ `null` ถ้ายังไม่ได้ตั้ง PIN_LOOKUP_PEPPER
 *
 * กรณี null ระบบยังทำงานถูกต้องทุกอย่าง เพียงแต่ verify_pin จะตกไปใช้
 * ทางเดินสำรองที่สแกนทั้งตารางแบบเดิม — ตั้ง env แล้วเร็วขึ้นเองโดยไม่ต้อง migrate ข้อมูล
 *
 * จงใจไม่ throw: pepper ไม่ใช่ตัวคุมสิทธิ์ (bcrypt ยังเป็นตัวตัดสิน)
 * การ throw จะทำให้ทั้งร้านล็อกอินไม่ได้เพราะลืมตั้ง env ตัวที่เป็นแค่ตัวเร่งความเร็ว
 */
export function pinLookupHash(pin: string): string | null {
  if (!pepper) {
    if (!warned) {
      warned = true;
      console.warn(
        '[pinLookup] ไม่ได้ตั้ง PIN_LOOKUP_PEPPER — verify_pin จะสแกน bcrypt ทั้งตาราง (ช้า). ' +
          'สร้างค่าด้วย `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"` ' +
          'แล้วใส่ใน .env.local และ env ของ production'
      );
    }
    return null;
  }
  return createHmac('sha256', pepper).update(pin).digest('hex');
}
