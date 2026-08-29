-- =============================================================
-- A2 (หางที่เหลือจาก 20260824_security_hardening)
--
--   1) เลิกเชื่อ client key ตัวเดียวในการกันเดา PIN
--      ผู้โจมตีสุ่ม x-forwarded-for ได้ (แก้ฝั่งแอปที่ lib/session.ts แล้ว)
--      แต่ยังต้องมี "เพดานรวมทั้งระบบ" ไว้กันกรณีคีย์ยังแยกได้อยู่ดี
--      → เพิ่มตัวนับ global: ผิดรวมกัน 20 ครั้งใน 5 นาที = ล็อกการล็อกอิน 60 วินาที
--        (bcrypt cost 10 ≈ 100ms/ครั้ง + เพดานนี้ ⇒ ไล่ครบ 10^6 PIN ใช้เวลาเป็นเดือน)
--
--   2) ปิดทางเดิน SHA-256 ใน verify_pin และ DROP คอลัมน์ employees.pin_hash
--      ตราบใดที่ยังมีคอลัมน์นี้ hash ที่ถอดได้ในไม่กี่วินาทีก็ยังอยู่ในฐานข้อมูล
--
-- ⚠️ ถ้ายังมีพนักงานที่ไม่เคยล็อกอินหลัง 20260824 (pin_bcrypt IS NULL)
--    migration นี้จะหยุดพร้อมข้อความบอกวิธีแก้ — ไม่ปล่อยให้ใครล็อกอินไม่ได้เงียบๆ
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 0. Guard — ห้ามตัดทางเดิน SHA-256 ถ้ายังมีคนพึ่งมันอยู่
-- -------------------------------------------------------------
DO $do$
DECLARE v_pending TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'employees'
               AND column_name = 'pin_hash')
  THEN
    EXECUTE $q$
      SELECT string_agg(e.name || ' (id=' || e.id || ')', ', ')
      FROM employees e
      WHERE e.pin_bcrypt IS NULL AND COALESCE(e.pin_hash, '') <> ''
    $q$ INTO v_pending;

    IF v_pending IS NOT NULL THEN
      RAISE EXCEPTION
        'ยังมีพนักงานที่ PIN ยังไม่ถูกอัปเกรดเป็น bcrypt: %. '
        'ให้ตั้ง PIN ใหม่ด้วย `node scripts/set-pin.mjs` (หรือให้เขาล็อกอิน 1 ครั้ง) ก่อนรัน migration นี้',
        v_pending;
    END IF;
  END IF;
END
$do$;

-- -------------------------------------------------------------
-- 1. verify_pin — ตัดทางเดิน SHA-256 + เพิ่มเพดานรวมทั้งระบบ
--    signature เดิม (TEXT, TEXT) → grant ที่ให้ service_role ไว้ยังอยู่
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_pin(p_pin TEXT, p_client_key TEXT)
RETURNS TABLE (emp_id INT, emp_name TEXT, emp_role TEXT, locked_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  -- เพดานต่อคีย์ (IP) — ผ่อนได้เพราะมีเพดานรวมคุมอีกชั้น
  c_key_max      CONSTANT INT      := 5;
  c_key_window   CONSTANT INTERVAL := INTERVAL '15 minutes';
  c_key_lock     CONSTANT INTERVAL := INTERVAL '3 minutes';
  -- เพดานรวมทั้งระบบ — ด่านสุดท้ายเมื่อผู้โจมตีสลับคีย์ได้
  c_global_key   CONSTANT TEXT     := '__global__';
  c_global_max   CONSTANT INT      := 20;
  c_global_window CONSTANT INTERVAL := INTERVAL '5 minutes';
  c_global_lock  CONSTANT INTERVAL := INTERVAL '1 minute';

  v_key          TEXT := COALESCE(NULLIF(TRIM(p_client_key), ''), 'unknown');
  v_locked_until TIMESTAMPTZ;
  v_id           INT;
  v_name         TEXT;
  v_role         TEXT;
  v_failed       INT;
BEGIN
  -- คีย์สงวนไว้สำหรับตัวนับรวม ห้ามให้ผู้เรียกยึดไปใช้
  IF v_key = c_global_key THEN v_key := 'unknown'; END IF;

  -- รูปแบบ PIN ไม่ถูกต้อง — ไม่ต้องแตะ employees และไม่นับเป็นความพยายาม
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{6}$' THEN
    RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT, 0;
    RETURN;
  END IF;

  -- 1.1 ระบบทั้งระบบถูกล็อกอยู่หรือไม่ (ตรวจก่อน เพราะเป็นด่านนอกสุด)
  SELECT pa.locked_until INTO v_locked_until
  FROM pin_attempts pa WHERE pa.client_key = c_global_key;

  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT,
                        CEIL(EXTRACT(EPOCH FROM (v_locked_until - NOW())))::INT;
    RETURN;
  END IF;

  -- 1.2 คีย์นี้ถูกล็อกอยู่หรือไม่
  SELECT pa.locked_until INTO v_locked_until
  FROM pin_attempts pa WHERE pa.client_key = v_key;

  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT,
                        CEIL(EXTRACT(EPOCH FROM (v_locked_until - NOW())))::INT;
    RETURN;
  END IF;

  -- 1.3 เทียบ bcrypt (ทางเดียวที่เหลือแล้ว)
  SELECT e.id, e.name::TEXT, e.role::TEXT INTO v_id, v_name, v_role
  FROM employees e
  WHERE e.pin_bcrypt IS NOT NULL
    AND e.pin_bcrypt = crypt(p_pin, e.pin_bcrypt)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    DELETE FROM pin_attempts WHERE client_key = v_key;
    RETURN QUERY SELECT v_id, v_name, v_role, 0;
    RETURN;
  END IF;

  -- 1.4 ล้มเหลว — นับทั้งต่อคีย์และรวมทั้งระบบ (นับแยกกัน หน้าต่างเวลาไม่เท่ากัน)
  INSERT INTO pin_attempts AS pa (client_key, failed_count, last_failed_at)
  VALUES (v_key, 1, NOW())
  ON CONFLICT (client_key) DO UPDATE
    SET failed_count = CASE WHEN pa.last_failed_at < NOW() - c_key_window
                            THEN 1 ELSE pa.failed_count + 1 END,
        last_failed_at = NOW()
  RETURNING pa.failed_count INTO v_failed;

  IF v_failed >= c_key_max THEN
    UPDATE pin_attempts
    SET locked_until = NOW() + c_key_lock, failed_count = 0
    WHERE client_key = v_key;

    RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT,
                        CEIL(EXTRACT(EPOCH FROM c_key_lock))::INT;
    RETURN;
  END IF;

  INSERT INTO pin_attempts AS pa (client_key, failed_count, last_failed_at)
  VALUES (c_global_key, 1, NOW())
  ON CONFLICT (client_key) DO UPDATE
    SET failed_count = CASE WHEN pa.last_failed_at < NOW() - c_global_window
                            THEN 1 ELSE pa.failed_count + 1 END,
        last_failed_at = NOW()
  RETURNING pa.failed_count INTO v_failed;

  IF v_failed >= c_global_max THEN
    UPDATE pin_attempts
    SET locked_until = NOW() + c_global_lock, failed_count = 0
    WHERE client_key = c_global_key;

    RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT,
                        CEIL(EXTRACT(EPOCH FROM c_global_lock))::INT;
    RETURN;
  END IF;

  RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT, 0;
END;
$fn$;

COMMENT ON FUNCTION public.verify_pin(TEXT, TEXT) IS
  'ตรวจ PIN ด้วย bcrypt ใน DB — เรียกได้เฉพาะ service_role ผ่าน /api/auth/login '
  'มีเพดาน 2 ชั้น: ต่อคีย์ (5 ครั้ง/15 นาที = ล็อก 3 นาที) และรวมทั้งระบบ (20 ครั้ง/5 นาที = ล็อก 1 นาที)';

-- -------------------------------------------------------------
-- 2. เลิกเขียน pin_hash ใน RPC จัดการพนักงาน (ต้องทำก่อน DROP COLUMN)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_add_employee(
  p_name TEXT, p_pin TEXT, p_role TEXT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $fn$
DECLARE v_id INT;
BEGIN
  IF p_role NOT IN ('owner', 'staff') THEN RAISE EXCEPTION 'invalid_role'; END IF;
  IF p_name IS NULL OR TRIM(p_name) = ''  THEN RAISE EXCEPTION 'empty_name';   END IF;
  IF p_pin  IS NULL OR p_pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'invalid_pin'; END IF;
  IF public.pin_taken(p_pin) THEN RETURN -1; END IF;

  INSERT INTO employees (name, role, pin_bcrypt)
  VALUES (TRIM(p_name), p_role, crypt(p_pin, gen_salt('bf', 10)))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_update_employee(
  p_employee_id INT,
  p_name TEXT DEFAULT NULL,
  p_pin  TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $fn$
DECLARE v_current_role TEXT;
BEGIN
  SELECT e.role::TEXT INTO v_current_role FROM employees e WHERE e.id = p_employee_id;
  IF v_current_role IS NULL THEN RETURN 'not_found'; END IF;

  IF p_role IS NOT NULL AND p_role NOT IN ('owner', 'staff') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  -- กันลดสิทธิ์ owner คนสุดท้ายจนไม่มีใครเข้าระบบหลังบ้านได้อีก
  IF p_role = 'staff' AND v_current_role = 'owner'
     AND (SELECT COUNT(*) FROM employees WHERE role = 'owner') <= 1 THEN
    RETURN 'last_owner';
  END IF;

  IF p_pin IS NOT NULL THEN
    IF p_pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'invalid_pin'; END IF;
    IF public.pin_taken(p_pin, p_employee_id) THEN RETURN 'pin_taken'; END IF;
  END IF;

  UPDATE employees SET
    name       = COALESCE(NULLIF(TRIM(COALESCE(p_name, '')), ''), name),
    role       = COALESCE(p_role, role),
    pin_bcrypt = CASE WHEN p_pin IS NULL THEN pin_bcrypt
                      ELSE crypt(p_pin, gen_salt('bf', 10)) END
  WHERE id = p_employee_id;

  RETURN 'ok';
END;
$fn$;

-- -------------------------------------------------------------
-- 3. ลบ SHA-256 hash ออกจากฐานข้อมูลถาวร
-- -------------------------------------------------------------
ALTER TABLE employees DROP COLUMN IF EXISTS pin_hash;

COMMENT ON COLUMN employees.pin_bcrypt IS
  'bcrypt hash ของ PIN (pgcrypto crypt/gen_salt cost 10) — ตรวจใน verify_pin() เท่านั้น '
  'ห้าม SELECT ออกนอก DB ไม่ว่ากรณีใด';

-- -------------------------------------------------------------
-- 4. ยืนยัน grant อีกครั้ง (idempotent — กันกรณี CREATE OR REPLACE เปลี่ยนเจ้าของสิทธิ์)
-- -------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.verify_pin(TEXT, TEXT),
  public.admin_add_employee(TEXT, TEXT, TEXT),
  public.admin_update_employee(INT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.verify_pin(TEXT, TEXT),
  public.admin_add_employee(TEXT, TEXT, TEXT),
  public.admin_update_employee(INT, TEXT, TEXT, TEXT)
  TO service_role;

COMMIT;
