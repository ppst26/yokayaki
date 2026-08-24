-- =============================================================
-- Migration: Security Hardening — A1 / A2 / A3
-- =============================================================
-- เป้าหมาย: ทำให้ anon key (ที่อยู่ใน JS bundle ของทุกคน) ไร้ค่า
--
--   A1  anon = full DB credential  → ลบ policy `USING(true)` ทั้งหมด + REVOKE grant
--   A2  PIN hash ถอดได้            → pgcrypto bcrypt + verify_pin() ที่ hash ไม่ออกจาก DB
--   A3  privilege escalation       → add/update/delete_employee เรียกได้เฉพาะ service_role
--   A7.1 seed PIN อยู่ใน git       → ปิดใช้งานบัญชีที่ยังใช้ PIN จาก seed
--   A7.2 RPC overload เก่าค้าง     → DROP overload ที่ไม่มีใครเรียกแล้ว
--
-- ⚠️ ต้อง deploy พร้อมกับโค้ดแอปเวอร์ชันใหม่ (server tier) — แอปเวอร์ชันเก่า
--    จะล็อกอินไม่ได้หลัง migration นี้ เพราะ employees ปิด SELECT จาก client แล้ว
-- =============================================================

BEGIN;

-- =============================================================
-- 1. pgcrypto + คอลัมน์ bcrypt
-- =============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS pin_bcrypt TEXT;

COMMENT ON COLUMN employees.pin_bcrypt IS
  'bcrypt hash ของ PIN (pgcrypto crypt/gen_salt). แทนที่ pin_hash แบบ SHA-256 ไม่ salt';
COMMENT ON COLUMN employees.pin_hash IS
  'DEPRECATED: SHA-256 ไม่ salt — เก็บไว้ชั่วคราวเพื่ออัปเกรดเป็น bcrypt ตอนล็อกอินครั้งถัดไป '
  'จะถูก DROP ในไฟล์ migration ถัดไปเมื่อพนักงานทุกคนล็อกอินครบแล้ว';

-- =============================================================
-- 2. ตัวนับความพยายามล็อกอินฝั่ง server
--    (แทนตัวนับใน localStorage ที่ผู้ใช้ลบทิ้งเองได้)
-- =============================================================
CREATE TABLE IF NOT EXISTS pin_attempts (
  client_key     TEXT PRIMARY KEY,
  failed_count   INT NOT NULL DEFAULT 0,
  locked_until   TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pin_attempts ENABLE ROW LEVEL SECURITY;
-- ไม่สร้าง policy = ไม่มี client role ไหนแตะได้ (มีแต่ SECURITY DEFINER / service_role)

-- =============================================================
-- 3. verify_pin — PIN ถูกส่งมาเป็น plaintext ผ่าน HTTPS ไปที่ server tier
--    แล้ว server tier เรียกฟังก์ชันนี้ด้วย service_role
--    hash ไม่เคยออกจากฐานข้อมูล และไม่มี PIN oracle ให้ยิงอีกต่อไป
-- =============================================================
CREATE OR REPLACE FUNCTION public.verify_pin(p_pin TEXT, p_client_key TEXT)
RETURNS TABLE (emp_id INT, emp_name TEXT, emp_role TEXT, locked_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_locked_until TIMESTAMPTZ;
  v_id           INT;
  v_name         TEXT;
  v_role         TEXT;
  v_sha          TEXT;
  v_failed       INT;
  v_key          TEXT := COALESCE(NULLIF(TRIM(p_client_key), ''), 'unknown');
BEGIN
  -- รูปแบบ PIN ไม่ถูกต้อง — ไม่ต้องแตะ employees เลย
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{6}$' THEN
    RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT, 0;
    RETURN;
  END IF;

  -- ยังอยู่ในช่วงล็อก?
  SELECT pa.locked_until INTO v_locked_until
  FROM pin_attempts pa WHERE pa.client_key = v_key;

  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT,
                        CEIL(EXTRACT(EPOCH FROM (v_locked_until - NOW())))::INT;
    RETURN;
  END IF;

  -- 3.1 เส้นทางหลัก: bcrypt
  SELECT e.id, e.name::TEXT, e.role::TEXT INTO v_id, v_name, v_role
  FROM employees e
  WHERE e.pin_bcrypt IS NOT NULL
    AND e.pin_bcrypt = crypt(p_pin, e.pin_bcrypt)
  LIMIT 1;

  -- 3.2 เส้นทางชั่วคราว: SHA-256 เดิม แล้วอัปเกรดเป็น bcrypt ทันที
  IF v_id IS NULL THEN
    v_sha := encode(digest(p_pin, 'sha256'), 'hex');

    SELECT e.id, e.name::TEXT, e.role::TEXT INTO v_id, v_name, v_role
    FROM employees e
    WHERE e.pin_bcrypt IS NULL
      AND e.pin_hash IS NOT NULL
      AND e.pin_hash <> ''
      AND e.pin_hash = v_sha
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      UPDATE employees
      SET pin_bcrypt = crypt(p_pin, gen_salt('bf', 10)),
          pin_hash   = ''
      WHERE id = v_id;
    END IF;
  END IF;

  -- 3.3 สำเร็จ
  IF v_id IS NOT NULL THEN
    DELETE FROM pin_attempts WHERE client_key = v_key;
    RETURN QUERY SELECT v_id, v_name, v_role, 0;
    RETURN;
  END IF;

  -- 3.4 ล้มเหลว — นับ และล็อกเมื่อครบ 5 ครั้ง
  INSERT INTO pin_attempts AS pa (client_key, failed_count, last_failed_at)
  VALUES (v_key, 1, NOW())
  ON CONFLICT (client_key) DO UPDATE
    SET failed_count   = pa.failed_count + 1,
        last_failed_at = NOW()
  RETURNING pa.failed_count INTO v_failed;

  IF v_failed >= 5 THEN
    UPDATE pin_attempts
    SET locked_until = NOW() + INTERVAL '3 minutes',
        failed_count = 0
    WHERE client_key = v_key;

    RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT, 180;
    RETURN;
  END IF;

  RETURN QUERY SELECT NULL::INT, NULL::TEXT, NULL::TEXT, 0;
END;
$fn$;

COMMENT ON FUNCTION public.verify_pin(TEXT, TEXT) IS
  'ตรวจ PIN ฝั่ง DB — เรียกได้เฉพาะ service_role ผ่าน /api/auth/login เท่านั้น';

-- =============================================================
-- 4. Helper สำหรับ RLS policy — อ่าน claim จาก JWT ที่ server tier เซ็น
-- =============================================================
CREATE OR REPLACE FUNCTION public.jwt_emp_role()
RETURNS TEXT
LANGUAGE sql STABLE
SET search_path = public
AS $fn$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'emp_role',
    ''
  );
$fn$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public
AS $fn$ SELECT public.jwt_emp_role() IN ('owner', 'staff'); $fn$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public
AS $fn$ SELECT public.jwt_emp_role() = 'owner'; $fn$;

COMMIT;

-- =============================================================
-- 5. ลบ RPC overload เก่าที่ไม่มีโค้ดเรียกแล้ว (A7.2)
--    โปรเจกต์นี้ใช้ CREATE OR REPLACE ตลอดโดยไม่เคย DROP
--    → overload อาริตี้เก่ายังเรียกได้ และบางตัวมีบั๊กที่แก้ไปแล้ว
-- =============================================================
BEGIN;

DROP FUNCTION IF EXISTS public.place_order_item(INT, INT, INT, NUMERIC);
DROP FUNCTION IF EXISTS public.customer_place_order_item(UUID, INT, INT, NUMERIC);
DROP FUNCTION IF EXISTS public.void_order_item(INT, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.complete_checkout(
  INT, VARCHAR, NUMERIC, NUMERIC, NUMERIC, INT, INT, VARCHAR);
DROP FUNCTION IF EXISTS public.complete_checkout(
  INT, VARCHAR, NUMERIC, NUMERIC, NUMERIC, INT, INT, VARCHAR, JSONB);

-- =============================================================
-- 6. ล้าง RLS policy เดิมทั้งหมด (~29 ตัว ล้วนเป็น USING (true))
-- =============================================================
DO $do$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname
           FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$do$;

-- ยืนยันว่า RLS เปิดอยู่ทุกตาราง (RLS เปิด + ไม่มี policy = ปฏิเสธทุกอย่าง)
DO $do$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END
$do$;

-- =============================================================
-- 7. Policy ใหม่
--    * ไม่มี policy ให้ role `anon` แม้แต่ตัวเดียว  ← หัวใจของการแก้ A1
--    * ทุก policy ผูกกับ claim `emp_role` ใน JWT ที่ server tier เซ็นเท่านั้น
--    * `service_role` bypass RLS อยู่แล้ว ไม่ต้องมี policy
-- =============================================================

-- 7.1 ตารางปฏิบัติการ — พนักงานทุกคนอ่านได้ (จำเป็นสำหรับ realtime subscription)
CREATE POLICY staff_read ON tables         FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY staff_read ON orders         FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY staff_read ON order_items    FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY staff_read ON menu_items     FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY staff_read ON promotions     FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY staff_read ON qr_sessions    FOR SELECT TO authenticated USING (public.is_staff());
-- ลูกค้าสมาชิก: พนักงานต้องค้นเบอร์ตอนเช็คบิล
CREATE POLICY staff_read ON loyalty_members FOR SELECT TO authenticated USING (public.is_staff());

-- 7.2 การเงิน + audit ที่หน้า "ประวัติการขาย" ต้องใช้
--     แท็บนี้เปิดให้ staff อยู่แล้ววันนี้ (TableMap.tsx:199 + SidebarNav ไม่ได้ gate ด้วย isOwner)
--     จึงคงสิทธิ์เดิมไว้ ไม่งั้นฟีเจอร์พังสำหรับพนักงาน
--     ⚠️ เชิงธุรกิจ: พนักงานทุกคนเห็นยอดขายทั้งร้าน + เบอร์ลูกค้าในบิล
--        ถ้าจะจำกัดเฉพาะ owner ต้องเปลี่ยนเป็น is_owner() พร้อม gate แท็บ history ใน UI ด้วย
CREATE POLICY staff_read ON payments           FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY staff_read ON payment_promotions FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY owner_read ON points_logs        FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY staff_read ON void_logs          FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY owner_read ON stock_logs         FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY owner_read ON item_ingredients   FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY owner_read ON purchase_orders    FOR SELECT TO authenticated USING (public.is_owner());

-- 7.3 การเขียนที่ยังทำจากเครื่อง POS ได้ (พนักงานที่ล็อกอินแล้วเท่านั้น)
--     ครัวกดเสิร์ฟ
CREATE POLICY staff_serve ON order_items
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
--     พนักงานสร้าง QR ให้ลูกค้า
CREATE POLICY staff_create ON qr_sessions
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());
--     สมัครสมาชิกใหม่ตอนเช็คบิล
CREATE POLICY staff_create ON loyalty_members
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

-- 7.4 การเขียนที่เป็นงานหลังร้าน — เฉพาะ owner (ตรงกับที่ UI gate ไว้อยู่แล้ว)
CREATE POLICY owner_write ON menu_items
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY owner_write ON promotions
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY owner_write ON item_ingredients
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY owner_write ON purchase_orders
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY owner_write ON points_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_owner());
CREATE POLICY owner_update ON loyalty_members
  FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY owner_delete ON loyalty_members
  FOR DELETE TO authenticated USING (public.is_owner());

-- 7.5 ตารางที่ไม่มี policy เลย = แตะไม่ได้จาก client ทุกกรณี
--     employees   → pin_hash ห้ามหลุด (A2) · จัดการผ่าน /api/employees เท่านั้น
--     pin_attempts→ ตัวนับ lockout
--     payments, payment_promotions, void_logs, stock_logs, orders, tables
--                 → เขียนได้เฉพาะผ่าน SECURITY DEFINER RPC หรือ server tier

COMMIT;

-- =============================================================
-- 8. REVOKE / GRANT — ส่วนที่ขาดหายไปทั้งโปรเจกต์
--
--    ⚠️ สำคัญที่สุดในไฟล์นี้: RLS policy อย่างเดียว "ไม่พอ"
--    RPC ทุกตัวเป็น SECURITY DEFINER ซึ่ง bypass RLS โดยธรรมชาติ
--    และ PostgreSQL GRANT EXECUTE ให้ PUBLIC เป็น default
--    → ถ้าไม่ revoke ตรงนี้ anon ยังเรียก add_employee(...,'owner') ได้เหมือนเดิม
-- =============================================================
BEGIN;

-- 8.1 anon: ไม่เหลืออะไรเลย
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON SCHEMA public FROM anon;
GRANT  USAGE ON SCHEMA public TO anon;   -- ต้องมี USAGE ไว้ ไม่งั้น PostgREST error แปลกๆ แทน 401/permission denied

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- 8.2 ฟังก์ชัน: ปิดหมดก่อน แล้วค่อยเปิดทีละตัว
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- 8.3 authenticated (เครื่อง POS ที่ล็อกอินด้วย PIN แล้ว)
GRANT SELECT ON tables, orders, order_items, menu_items, promotions,
                qr_sessions, loyalty_members                       TO authenticated;
-- table privilege เปิดกว้างไว้ แล้วให้ RLS เป็นตัวตัดสินจริงว่าใครเห็นอะไร
-- (payments / payment_promotions / void_logs = staff · ที่เหลือ = owner ตามข้อ 7.2-7.3)
GRANT SELECT ON payments, payment_promotions, points_logs, void_logs,
                stock_logs, item_ingredients, purchase_orders      TO authenticated;

GRANT UPDATE          ON order_items                               TO authenticated;
GRANT INSERT          ON qr_sessions                               TO authenticated;
GRANT INSERT, UPDATE, DELETE ON loyalty_members                    TO authenticated;
GRANT INSERT, UPDATE, DELETE ON menu_items, promotions,
                                item_ingredients, purchase_orders  TO authenticated;
GRANT INSERT          ON points_logs                               TO authenticated;
GRANT USAGE, SELECT   ON ALL SEQUENCES IN SCHEMA public            TO authenticated;

-- helper ที่ policy เรียกใช้ระหว่างประเมินสิทธิ์
GRANT EXECUTE ON FUNCTION public.jwt_emp_role(), public.is_staff(), public.is_owner()
  TO authenticated;

-- RPC ที่เครื่อง POS เรียกตรงได้ (เฉพาะ overload ปัจจุบัน)
GRANT EXECUTE ON FUNCTION public.place_order_item(INT, INT, INT, NUMERIC, VARCHAR)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_order_item(INT, VARCHAR, VARCHAR, INT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_checkout(
  INT, VARCHAR, NUMERIC, NUMERIC, NUMERIC, INT, INT, VARCHAR, JSONB, NUMERIC, NUMERIC)
  TO authenticated;

-- 8.4 service_role (server tier เท่านั้น)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

COMMIT;

-- =============================================================
-- 9. A7.1 — ปิดใช้งาน PIN ที่มาจาก seed / README ซึ่งอยู่ใน git สาธารณะ
--    owner seed = SHA-256('')  → ทุกวันนี้ "ไม่กรอก PIN เลย" ล็อกอินเป็น owner ได้
--    บัญชีที่โดนล้างจะล็อกอินไม่ได้จนกว่าจะตั้ง PIN ใหม่ด้วย  node scripts/set-pin.mjs
-- =============================================================
BEGIN;

UPDATE employees
SET pin_hash = '', pin_bcrypt = NULL
WHERE pin_bcrypt IS NULL
  AND pin_hash IN (
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', -- SHA-256('')      ← owner seed
    '8d969ee76d243c53b6b3061467aa3b8d30c441408eb39af7194b14091118366d', -- staff seed ใน init_schema
    '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', -- SHA-256('123456')
    'bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a', -- SHA-256('111111') ← README
    '4cc8f4d609b717356701c57a03e737e5ac8fe885da8c7163d3de47e01849c635', -- SHA-256('222222') ← README
    '91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203'  -- SHA-256('000000')
  );

COMMIT;

-- =============================================================
-- 10. A3 — แทนที่ RPC จัดการพนักงานทั้งชุด
--
--     ของเดิม: add_employee/update_employee เป็น SECURITY DEFINER ที่ "ไม่มี
--     authorization check เลย" + รับ pin_hash (SHA-256) ที่ client คำนวณเอง
--     → ใครก็สร้างบัญชี owner ให้ตัวเองได้
--
--     ของใหม่: รับ PIN เป็น plaintext แล้ว hash ด้วย bcrypt ใน DB
--              เรียกได้เฉพาะ service_role → authorization อยู่ที่ /api/employees
--              ซึ่งตรวจ claim emp_role='owner' จาก cookie ที่ server เซ็นเอง
-- =============================================================
BEGIN;

DROP FUNCTION IF EXISTS public.add_employee(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_employee(INT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.delete_employee(INT, TEXT);

-- 10.1 รายชื่อพนักงาน (ไม่มี hash ใดๆ ออกไป)
CREATE OR REPLACE FUNCTION public.admin_list_employees()
RETURNS TABLE (id INT, name TEXT, role TEXT, has_pin BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $fn$
  SELECT e.id, e.name::TEXT, e.role::TEXT,
         (e.pin_bcrypt IS NOT NULL) AS has_pin,
         e.created_at
  FROM employees e ORDER BY e.id;
$fn$;

-- 10.2 ตรวจว่า PIN ซ้ำกับใครหรือยัง (bcrypt เทียบตรงๆ ไม่ได้ ต้องวน)
CREATE OR REPLACE FUNCTION public.pin_taken(p_pin TEXT, p_exclude_id INT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.pin_bcrypt IS NOT NULL
      AND (p_exclude_id IS NULL OR e.id <> p_exclude_id)
      AND e.pin_bcrypt = crypt(p_pin, e.pin_bcrypt)
  );
$fn$;

-- 10.3 เพิ่มพนักงาน — คืน id, หรือ -1 ถ้า PIN ซ้ำ
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

  INSERT INTO employees (name, pin_hash, role, pin_bcrypt)
  VALUES (TRIM(p_name), '', p_role, crypt(p_pin, gen_salt('bf', 10)))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

-- 10.4 แก้ไขพนักงาน — ส่ง NULL ในช่องที่ไม่ต้องการเปลี่ยน
--      คืน 'ok' | 'not_found' | 'pin_taken' | 'last_owner'
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
                      ELSE crypt(p_pin, gen_salt('bf', 10)) END,
    pin_hash   = CASE WHEN p_pin IS NULL THEN pin_hash ELSE '' END
  WHERE id = p_employee_id;

  RETURN 'ok';
END;
$fn$;

-- 10.5 ลบพนักงาน — ตัวตนผู้สั่งมาจาก JWT ฝั่ง server ไม่ใช่ PIN ที่ client ส่งมา
--      คืน 'ok' | 'not_found' | 'self_delete' | 'last_owner'
CREATE OR REPLACE FUNCTION public.admin_delete_employee(
  p_employee_id INT, p_actor_id INT
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_role TEXT;
BEGIN
  IF p_employee_id = p_actor_id THEN RETURN 'self_delete'; END IF;

  SELECT e.role::TEXT INTO v_role FROM employees e WHERE e.id = p_employee_id;
  IF v_role IS NULL THEN RETURN 'not_found'; END IF;

  IF v_role = 'owner'
     AND (SELECT COUNT(*) FROM employees WHERE role = 'owner') <= 1 THEN
    RETURN 'last_owner';
  END IF;

  DELETE FROM employees WHERE id = p_employee_id;
  RETURN 'ok';
END;
$fn$;

-- ฟังก์ชันชุดนี้ทั้งหมดเรียกได้เฉพาะ service_role (server tier)
REVOKE EXECUTE ON FUNCTION
  public.admin_list_employees(),
  public.pin_taken(TEXT, INT),
  public.admin_add_employee(TEXT, TEXT, TEXT),
  public.admin_update_employee(INT, TEXT, TEXT, TEXT),
  public.admin_delete_employee(INT, INT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.admin_list_employees(),
  public.pin_taken(TEXT, INT),
  public.admin_add_employee(TEXT, TEXT, TEXT),
  public.admin_update_employee(INT, TEXT, TEXT, TEXT),
  public.admin_delete_employee(INT, INT),
  public.verify_pin(TEXT, TEXT)
  TO service_role;

COMMIT;
