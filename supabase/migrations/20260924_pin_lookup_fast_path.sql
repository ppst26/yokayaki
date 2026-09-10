-- =============================================================
-- PERF/1 — verify_pin เลิกสแกน bcrypt ทั้งตาราง employees
--
-- ปัญหาเดิม (20260825):
--   WHERE e.pin_bcrypt = crypt(p_pin, e.pin_bcrypt)
--   ฝั่งขวาของ '=' ขึ้นกับค่าในแถว → index ใช้ไม่ได้ → seq scan + bcrypt cost 10
--   ต่อ "ทุกแถว" (~60-100 ms/แถว) และไม่มี org filter จึงสแกนพนักงานของทุกองค์กร
--   ⇒ ล็อกอินช้าเป็นเชิงเส้นตามจำนวนพนักงานทั้งระบบ (10 คน ≈ 1 วิ, 30 คน ≈ 2-3 วิ)
--
-- วิธีแก้: เพิ่มคอลัมน์ค้นหาแบบ deterministic ที่ index ได้
--   pin_lookup = HMAC-SHA256(pin, PIN_LOOKUP_PEPPER)  ← คำนวณใน Node ฝั่ง server tier
--   → หาแถวด้วย index (O(1)) แล้วค่อย bcrypt "ครั้งเดียว" เพื่อยืนยัน
--
-- ⚠️ pepper อยู่ใน env ของ server tier เท่านั้น ไม่เก็บใน DB โดยเจตนา
--    DB dump ที่หลุดออกไปจึงยังเจอแค่ bcrypt เหมือนเดิม — ระดับการป้องกันไม่ลดลง
--    pin_bcrypt ยังเป็นตัวตัดสินเดียว pin_lookup เป็นแค่ตัวช่วยหาแถว
--
-- ⚠️ แถวเก่าที่ตั้ง PIN ไว้ก่อน migration นี้จะมี pin_lookup IS NULL
--    verify_pin มีทางเดินสำรองสแกนเฉพาะแถวเหล่านั้น แล้ว backfill ให้อัตโนมัติ
--    เมื่อล็อกอินสำเร็จ 1 ครั้ง → ไม่มีใครถูกล็อกออกจากระบบ และเร็วขึ้นเองทีละคน
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. คอลัมน์ + index
-- -------------------------------------------------------------
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pin_lookup TEXT;

COMMENT ON COLUMN public.employees.pin_lookup IS
  'HMAC-SHA256(pin, PIN_LOOKUP_PEPPER) hex — ตัวช่วยหาแถวให้ verify_pin ไม่ต้อง bcrypt ทั้งตาราง. pepper อยู่ใน env ของ server tier ไม่เก็บใน DB · ตัวตัดสินจริงยังเป็น pin_bcrypt';

-- ไม่ใช้ UNIQUE โดยเจตนา: backfill เกิดระหว่างล็อกอิน ห้ามมีทางที่ล็อกอินพังเพราะ index
-- ความเป็น unique ของ PIN ยังบังคับผ่าน public.pin_taken() เหมือนเดิม
CREATE INDEX IF NOT EXISTS idx_employees_pin_lookup
  ON public.employees (pin_lookup)
  WHERE pin_lookup IS NOT NULL;

-- index เดิมบน pin_bcrypt ไม่มีวันถูกใช้ (ฝั่งขวาของ = ขึ้นกับแถว) — เปลืองพื้นที่และ write amplification
DROP INDEX IF EXISTS public.idx_employees_pin_bcrypt;

-- -------------------------------------------------------------
-- 2. verify_pin — signature ใหม่ (เพิ่ม p_pin_lookup)
--    DROP ตัวเก่าทิ้ง ไม่ปล่อยให้ทางเดินช้าค้างอยู่ให้เรียกได้
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.verify_pin(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_pin(
  p_pin         TEXT,
  p_client_key  TEXT,
  p_pin_lookup  TEXT DEFAULT NULL
)
RETURNS TABLE (emp_id INT, emp_name TEXT, emp_role TEXT, locked_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  -- เพดานต่อคีย์ (IP)
  c_key_max       CONSTANT INT      := 5;
  c_key_window    CONSTANT INTERVAL := INTERVAL '15 minutes';
  c_key_lock      CONSTANT INTERVAL := INTERVAL '3 minutes';
  -- เพดานรวมทั้งระบบ
  c_global_key    CONSTANT TEXT     := '__global__';
  c_global_max    CONSTANT INT      := 20;
  c_global_window CONSTANT INTERVAL := INTERVAL '5 minutes';
  c_global_lock   CONSTANT INTERVAL := INTERVAL '1 minute';

  v_key          TEXT := COALESCE(NULLIF(TRIM(p_client_key), ''), 'unknown');
  v_locked_until TIMESTAMPTZ;
  v_id           INT;
  v_name         TEXT;
  v_role         TEXT;
  v_bcrypt       TEXT;
  v_failed       INT;
BEGIN
  IF v_key = c_global_key THEN v_key := 'unknown'; END IF;

  IF p_pin IS NULL OR p_pin !~ '^[0-9]{6}$' THEN
    RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT, 0;
    RETURN;
  END IF;

  -- 2.1 ระบบทั้งระบบถูกล็อกอยู่หรือไม่
  SELECT pa.locked_until INTO v_locked_until
  FROM pin_attempts pa WHERE pa.client_key = c_global_key;

  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT,
                        CEIL(EXTRACT(EPOCH FROM (v_locked_until - NOW())))::INT;
    RETURN;
  END IF;

  -- 2.2 คีย์นี้ถูกล็อกอยู่หรือไม่
  SELECT pa.locked_until INTO v_locked_until
  FROM pin_attempts pa WHERE pa.client_key = v_key;

  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT,
                        CEIL(EXTRACT(EPOCH FROM (v_locked_until - NOW())))::INT;
    RETURN;
  END IF;

  -- 2.3 ทางเดินเร็ว — index scan 1 แถว แล้ว bcrypt ครั้งเดียว
  --     แยกอ่านแถวก่อนแล้วค่อยเทียบ ไม่รวมไว้ใน WHERE เดียวกัน
  --     เพื่อไม่ให้ planner มีโอกาสเลือกประเมิน crypt() ก่อน index
  IF p_pin_lookup IS NOT NULL THEN
    SELECT e.id, e.name::TEXT, e.role::TEXT, e.pin_bcrypt
      INTO v_id, v_name, v_role, v_bcrypt
    FROM employees e
    WHERE e.pin_lookup = p_pin_lookup
      AND e.pin_bcrypt IS NOT NULL
    LIMIT 1;

    IF v_id IS NOT NULL AND v_bcrypt <> crypt(p_pin, v_bcrypt) THEN
      -- lookup ชนแต่ bcrypt ไม่ตรง (pepper ถูกหมุน หรือ hash ชน) — ถือว่าไม่เจอ
      v_id := NULL; v_name := NULL; v_role := NULL;
    END IF;
  END IF;

  -- 2.4 ทางเดินสำรอง — สแกนแบบเดิม (ช้า) แล้ว backfill ให้
  --     จงใจสแกน "ทุกแถว" ไม่ใช่เฉพาะแถวที่ pin_lookup IS NULL:
  --     ถ้าจำกัดไว้ การเปลี่ยน PIN_LOOKUP_PEPPER จะทำให้ทั้งร้านล็อกอินไม่ได้ถาวร
  --     แบบนี้ pepper หมุนเมื่อไหร่ ระบบก็ซ่อมตัวเองทีละคนตอนล็อกอินสำเร็จ
  --
  --     ราคาที่จ่าย: ทางนี้ถูกใช้เฉพาะตอน "PIN ผิด" หรือยังไม่ backfill
  --     ซึ่งถูกจำกัดด้วย lockout อยู่แล้ว (5 ครั้ง/คีย์, 20 ครั้ง/ระบบ)
  IF v_id IS NULL THEN
    SELECT e.id, e.name::TEXT, e.role::TEXT INTO v_id, v_name, v_role
    FROM employees e
    WHERE e.pin_bcrypt IS NOT NULL
      AND e.pin_bcrypt = crypt(p_pin, e.pin_bcrypt)
    LIMIT 1;

    -- backfill ให้ครั้งหน้าเข้าทางเร็ว — ห้ามทำให้ล็อกอินพังถ้าเขียนไม่ได้
    IF v_id IS NOT NULL AND p_pin_lookup IS NOT NULL THEN
      BEGIN
        UPDATE employees SET pin_lookup = p_pin_lookup WHERE id = v_id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  IF v_id IS NOT NULL THEN
    DELETE FROM pin_attempts WHERE client_key = v_key;
    RETURN QUERY SELECT v_id, v_name, v_role, 0;
    RETURN;
  END IF;

  -- 2.5 ล้มเหลว — นับทั้งต่อคีย์และรวมทั้งระบบ (นับแยกกัน หน้าต่างเวลาไม่เท่ากัน)
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

COMMENT ON FUNCTION public.verify_pin(TEXT, TEXT, TEXT) IS
  'ตรวจ PIN ด้วย bcrypt ใน DB — เรียกได้เฉพาะ service_role ผ่าน /api/auth/login. หาแถวด้วย p_pin_lookup (indexed) แล้ว bcrypt ครั้งเดียว · แถวที่ยังไม่ backfill ใช้ทางเดินสำรอง. เพดาน 2 ชั้น: ต่อคีย์ (5 ครั้ง/15 นาที = ล็อก 3 นาที) และรวมทั้งระบบ (20 ครั้ง/5 นาที = ล็อก 1 นาที)';

REVOKE EXECUTE ON FUNCTION public.verify_pin(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT, TEXT, TEXT) TO service_role;

-- -------------------------------------------------------------
-- 3. pin_taken — เข้า index เมื่อมี lookup, สแกนเฉพาะแถวที่ยังไม่ backfill
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.pin_taken(TEXT, INT);

CREATE OR REPLACE FUNCTION public.pin_taken(
  p_pin        TEXT,
  p_exclude_id INT  DEFAULT NULL,
  p_pin_lookup TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions
AS $fn$
  -- ตัวแรกเข้า index → ตอบ true ทันทีเมื่อ PIN ซ้ำจริง (กรณีที่ต้องเร็ว)
  -- ตัวหลังสแกนทุกแถวเมื่อตัวแรกไม่เจอ — ยอมช้าเพื่อไม่ให้มี PIN ซ้ำหลุดเข้าไป
  -- (ถ้ากรองเฉพาะ pin_lookup IS NULL จะพลาดแถวที่ pepper หมุนไปแล้ว)
  SELECT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.pin_lookup = p_pin_lookup
      AND (p_exclude_id IS NULL OR e.id <> p_exclude_id)
  ) OR EXISTS (
    SELECT 1 FROM employees e
    WHERE e.pin_bcrypt IS NOT NULL
      AND (p_exclude_id IS NULL OR e.id <> p_exclude_id)
      AND e.pin_bcrypt = crypt(p_pin, e.pin_bcrypt)
  );
$fn$;

COMMENT ON FUNCTION public.pin_taken(TEXT, INT, TEXT) IS
  'PIN ซ้ำกับพนักงานคนอื่นหรือไม่ — ใช้ pin_lookup เข้า index ก่อน เหลือ bcrypt เฉพาะแถวที่ยังไม่ backfill';

REVOKE EXECUTE ON FUNCTION public.pin_taken(TEXT, INT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pin_taken(TEXT, INT, TEXT) TO service_role;

-- -------------------------------------------------------------
-- 4. admin_add_employee / admin_update_employee — รับ p_pin_lookup แล้วเขียนลงคอลัมน์
--    (ไม่งั้นพนักงานที่เพิ่มใหม่จะไม่มี lookup และตกไปทางเดินสำรองตลอดไป)
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_add_employee(TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.admin_add_employee(
  p_name       TEXT,
  p_pin        TEXT,
  p_role       TEXT,
  p_org_id     UUID,
  p_pin_lookup TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $fn$
DECLARE v_id INT;
BEGIN
  IF p_org_id IS NULL OR NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'invalid_org';
  END IF;
  IF p_role NOT IN ('owner', 'manager', 'cashier', 'kitchen', 'accountant') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;
  IF p_name IS NULL OR TRIM(p_name) = ''  THEN RAISE EXCEPTION 'empty_name';   END IF;
  IF p_pin  IS NULL OR p_pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'invalid_pin'; END IF;
  IF public.pin_taken(p_pin, NULL, p_pin_lookup) THEN RETURN -1; END IF;

  INSERT INTO employees (name, role, pin_bcrypt, pin_lookup, org_id)
  VALUES (TRIM(p_name), p_role, crypt(p_pin, gen_salt('bf', 10)), p_pin_lookup, p_org_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

COMMENT ON FUNCTION public.admin_add_employee(TEXT, TEXT, TEXT, UUID, TEXT) IS
  'เพิ่มพนักงานพร้อม org_id — service_role เท่านั้น · เขียน pin_lookup ให้ verify_pin เข้าทางเร็ว';

REVOKE EXECUTE ON FUNCTION public.admin_add_employee(TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_employee(TEXT, TEXT, TEXT, UUID, TEXT) TO service_role;

DROP FUNCTION IF EXISTS public.admin_update_employee(INT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_update_employee(
  p_employee_id INT,
  p_name        TEXT DEFAULT NULL,
  p_pin         TEXT DEFAULT NULL,
  p_role        TEXT DEFAULT NULL,
  p_pin_lookup  TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $fn$
DECLARE v_current_role TEXT;
BEGIN
  SELECT e.role::TEXT INTO v_current_role FROM employees e WHERE e.id = p_employee_id;
  IF v_current_role IS NULL THEN RETURN 'not_found'; END IF;

  IF p_role IS NOT NULL AND p_role NOT IN ('owner', 'manager', 'cashier', 'kitchen', 'accountant') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  -- กันลดสิทธิ์ owner คนสุดท้ายจนไม่มีใครเข้าระบบหลังบ้านได้อีก
  IF p_role IS NOT NULL AND p_role NOT IN ('owner', 'manager') AND v_current_role = 'owner'
     AND (SELECT COUNT(*) FROM employees WHERE role = 'owner') <= 1 THEN
    RETURN 'last_owner';
  END IF;

  IF p_pin IS NOT NULL THEN
    IF p_pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'invalid_pin'; END IF;
    IF public.pin_taken(p_pin, p_employee_id, p_pin_lookup) THEN RETURN 'pin_taken'; END IF;
  END IF;

  UPDATE employees SET
    name       = COALESCE(NULLIF(TRIM(COALESCE(p_name, '')), ''), name),
    role       = COALESCE(p_role, role),
    pin_bcrypt = CASE WHEN p_pin IS NULL THEN pin_bcrypt
                      ELSE crypt(p_pin, gen_salt('bf', 10)) END,
    -- PIN เปลี่ยน → lookup ต้องเปลี่ยนตาม (NULL ได้ถ้ายังไม่ได้ตั้ง pepper — ตกไปทางเดินสำรอง)
    pin_lookup = CASE WHEN p_pin IS NULL THEN pin_lookup
                      ELSE p_pin_lookup END
  WHERE id = p_employee_id;

  RETURN 'ok';
END;
$fn$;

COMMENT ON FUNCTION public.admin_update_employee(INT, TEXT, TEXT, TEXT, TEXT) IS
  'แก้ไขพนักงาน — service_role เท่านั้น · กันลดสิทธิ์ owner คนสุดท้าย · อัปเดต pin_lookup ตาม PIN ใหม่';

REVOKE EXECUTE ON FUNCTION public.admin_update_employee(INT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_employee(INT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMIT;
