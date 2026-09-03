-- =============================================================
-- M3 — RPC จัดการพนักงาน (A3)
--
-- security.sql ครอบไว้แล้วว่า add_employee/update_employee/delete_employee ชุดเก่าถูก DROP
-- และ anon เรียก RPC ไม่ได้ · ไฟล์นี้ไล่ตัว admin_* ที่มาแทน:
-- ใครเรียกได้ · ไม่มี hash หลุดออกมา · เงื่อนไขที่กันร้านล็อกตัวเองออกจากระบบ
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

-- -------------------------------------------------------------
-- A3 · ชุด admin_* เรียกได้เฉพาะ service_role (server tier) เท่านั้น
-- -------------------------------------------------------------
DO $$
DECLARE
  v_fn   TEXT;
  v_role TEXT;
  v_bad  TEXT := '';
BEGIN
  FOREACH v_fn IN ARRAY ARRAY[
    'public.admin_list_employees()',
    'public.admin_add_employee(text,text,text)',
    'public.admin_update_employee(int,text,text,text)',
    'public.admin_delete_employee(int,int)',
    'public.pin_taken(text,int)',
    'public.verify_pin(text,text)'
  ]
  LOOP
    FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated', 'public']
    LOOP
      IF has_function_privilege(v_role, v_fn, 'EXECUTE') THEN
        v_bad := v_bad || format('%s→%s ', v_role, v_fn);
      END IF;
    END LOOP;

    IF NOT has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'A3 ไม่ผ่าน: service_role เรียก % ไม่ได้ (server tier จะพัง)', v_fn;
    END IF;
  END LOOP;

  IF v_bad <> '' THEN
    RAISE EXCEPTION 'A3 ไม่ผ่าน: role ที่ไม่ควรเรียกได้ยังเรียกได้: %', v_bad;
  END IF;

  RAISE NOTICE 'PASS  A3 · admin_* + verify_pin เรียกได้เฉพาะ service_role';
END
$$;

-- -------------------------------------------------------------
-- A2 · รายชื่อพนักงานต้องไม่พา hash ออกไปด้วย
-- -------------------------------------------------------------
DO $$
DECLARE
  v_result_type TEXT;
  v_id          INT;
  v_has_pin     BOOLEAN;
BEGIN
  SELECT pg_get_function_result(p.oid) INTO v_result_type
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_list_employees';

  IF v_result_type ILIKE '%bcrypt%' OR v_result_type ILIKE '%pin_hash%' THEN
    RAISE EXCEPTION 'A2 ไม่ผ่าน: admin_list_employees คืน hash ออกมาด้วย (%)', v_result_type;
  END IF;

  v_id := public.admin_add_employee('พนักงานทดสอบรายชื่อ', '918273', 'staff');

  SELECT e.has_pin INTO v_has_pin
  FROM public.admin_list_employees() e WHERE e.id = v_id;

  IF v_has_pin IS NOT TRUE THEN
    RAISE EXCEPTION 'A2 ไม่ผ่าน: has_pin ควรเป็น TRUE สำหรับพนักงานที่เพิ่งตั้ง PIN';
  END IF;

  RAISE NOTICE 'PASS  A2 · admin_list_employees บอกแค่ว่ามี PIN แล้วหรือยัง ไม่ส่ง hash';
END
$$;

-- -------------------------------------------------------------
-- admin_add_employee · ตรวจ input และกัน PIN ซ้ำ
-- -------------------------------------------------------------
DO $$
DECLARE
  v_id     INT;
  v_dup    INT;
  v_bcrypt TEXT;
  v_case   TEXT;
BEGIN
  -- role / ชื่อ / รูปแบบ PIN ที่ผิดต้องโยน error ไม่ใช่บันทึกครึ่งๆ
  FOREACH v_case IN ARRAY ARRAY['bad_role', 'empty_name', 'short_pin', 'alpha_pin']
  LOOP
    BEGIN
      CASE v_case
        WHEN 'bad_role'   THEN v_id := public.admin_add_employee('ทดสอบ', '827364', 'admin');
        WHEN 'empty_name' THEN v_id := public.admin_add_employee('   ',    '827364', 'staff');
        WHEN 'short_pin'  THEN v_id := public.admin_add_employee('ทดสอบ', '1234',   'staff');
        ELSE                   v_id := public.admin_add_employee('ทดสอบ', 'abcdef', 'staff');
      END CASE;
      RAISE EXCEPTION 'ไม่ผ่าน: admin_add_employee ยอมรับ input แบบ %', v_case;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%invalid_role%'
         AND SQLERRM NOT LIKE '%empty_name%'
         AND SQLERRM NOT LIKE '%invalid_pin%' THEN
        RAISE EXCEPTION 'ไม่ผ่าน (%): คาดหวัง invalid_role/empty_name/invalid_pin ได้ %', v_case, SQLERRM;
      END IF;
    END;
  END LOOP;

  v_id := public.admin_add_employee('พนักงานทดสอบ PIN', '827364', 'staff');
  IF v_id IS NULL OR v_id <= 0 THEN
    RAISE EXCEPTION 'ไม่ผ่าน: เพิ่มพนักงานที่ข้อมูลถูกต้องไม่สำเร็จ (ได้ %)', v_id;
  END IF;

  -- PIN เก็บเป็น bcrypt ($2...) ไม่ใช่ plaintext และไม่ใช่ SHA-256
  SELECT e.pin_bcrypt INTO v_bcrypt FROM employees e WHERE e.id = v_id;
  IF v_bcrypt IS NULL OR LEFT(v_bcrypt, 2) <> '$2' THEN
    RAISE EXCEPTION 'A2 ไม่ผ่าน: PIN ไม่ได้ถูก hash ด้วย bcrypt (%)', LEFT(COALESCE(v_bcrypt, ''), 10);
  END IF;
  IF v_bcrypt = '827364' THEN
    RAISE EXCEPTION 'A2 ไม่ผ่าน: PIN ถูกเก็บเป็น plaintext';
  END IF;

  -- PIN ซ้ำกับคนอื่น → -1 (ไม่ใช่สร้างซ้อนแล้วล็อกอินสลับคนกัน)
  v_dup := public.admin_add_employee('พนักงาน PIN ซ้ำ', '827364', 'staff');
  IF v_dup <> -1 THEN
    RAISE EXCEPTION 'ไม่ผ่าน: PIN ซ้ำควรคืน -1 ได้ %', v_dup;
  END IF;

  RAISE NOTICE 'PASS  admin_add_employee · ตรวจ input · hash bcrypt · PIN ซ้ำคืน -1';
END
$$;

-- -------------------------------------------------------------
-- admin_update_employee · แก้ชื่อ/PIN/role และกันลดสิทธิ์ owner คนสุดท้าย
-- -------------------------------------------------------------
DO $$
DECLARE
  v_staff INT;
  v_other INT;
  v_owner INT;
  v_res   TEXT;
  v_name  TEXT;
BEGIN
  v_staff := public.admin_add_employee('พนักงานก่อนแก้ชื่อ', '736455', 'staff');
  v_other := public.admin_add_employee('พนักงานอีกคน',      '645544', 'staff');

  -- ไม่มีพนักงานคนนี้
  IF public.admin_update_employee(2147483600, 'ใครก็ไม่รู้', NULL, NULL) <> 'not_found' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: แก้พนักงานที่ไม่มีจริงไม่ได้คืน not_found';
  END IF;

  -- แก้ชื่อโดยไม่ส่ง PIN → PIN เดิมต้องยังใช้ได้
  v_res := public.admin_update_employee(v_staff, 'พนักงานหลังแก้ชื่อ', NULL, NULL);
  SELECT e.name INTO v_name FROM employees e WHERE e.id = v_staff;

  IF v_res <> 'ok' OR v_name <> 'พนักงานหลังแก้ชื่อ' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: แก้ชื่อไม่สำเร็จ (% / %)', v_res, v_name;
  END IF;
  IF NOT public.pin_taken('736455', NULL) THEN
    RAISE EXCEPTION 'ไม่ผ่าน: แก้ชื่อแล้ว PIN เดิมหายไป';
  END IF;

  -- ตั้ง PIN ทับของคนอื่น → ต้องถูกปฏิเสธ
  IF public.admin_update_employee(v_staff, NULL, '645544', NULL) <> 'pin_taken' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: ตั้ง PIN ทับของคนอื่นได้';
  END IF;

  -- เปลี่ยน PIN ตัวเอง → PIN ใหม่ใช้ได้ PIN เก่าหายไป
  IF public.admin_update_employee(v_staff, NULL, '554433', NULL) <> 'ok' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: เปลี่ยน PIN ของตัวเองไม่สำเร็จ';
  END IF;
  IF NOT public.pin_taken('554433', NULL) OR public.pin_taken('736455', NULL) THEN
    RAISE EXCEPTION 'ไม่ผ่าน: PIN ใหม่/เก่าไม่ถูกสลับให้ถูกต้อง';
  END IF;

  -- role ที่ไม่มีจริง
  BEGIN
    v_res := public.admin_update_employee(v_staff, NULL, NULL, 'superuser');
    RAISE EXCEPTION 'ไม่ผ่าน: ตั้ง role ที่ไม่มีจริงได้';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%invalid_role%' THEN
      RAISE EXCEPTION 'ไม่ผ่าน: คาดหวัง invalid_role ได้ %', SQLERRM;
    END IF;
  END;

  -- เหลือ owner คนเดียวแล้วลดสิทธิ์ตัวเอง = ไม่มีใครเข้าหลังบ้านได้อีก
  SELECT e.id INTO v_owner FROM employees e WHERE e.role = 'owner' ORDER BY e.id LIMIT 1;
  IF v_owner IS NULL THEN
    v_owner := public.admin_add_employee('เจ้าของร้านทดสอบ', '443322', 'owner');
  END IF;
  UPDATE employees SET role = 'staff' WHERE role = 'owner' AND id <> v_owner;

  IF public.admin_update_employee(v_owner, NULL, NULL, 'staff') <> 'last_owner' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: ลดสิทธิ์ owner คนสุดท้ายได้';
  END IF;
  IF (SELECT e.role::TEXT FROM employees e WHERE e.id = v_owner) <> 'owner' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: owner คนสุดท้ายถูกลดสิทธิ์จริงในตาราง';
  END IF;

  RAISE NOTICE 'PASS  admin_update_employee · แก้ชื่อ/PIN · กัน PIN ซ้ำ · กันลดสิทธิ์ owner คนสุดท้าย';
END
$$;

-- -------------------------------------------------------------
-- admin_delete_employee · กันลบตัวเองและ owner คนสุดท้าย
-- -------------------------------------------------------------
DO $$
DECLARE
  v_owner INT;
  v_staff INT;
  v_gone  INT;
BEGIN
  SELECT e.id INTO v_owner FROM employees e WHERE e.role = 'owner' ORDER BY e.id LIMIT 1;
  IF v_owner IS NULL THEN
    v_owner := public.admin_add_employee('เจ้าของร้านทดสอบลบ', '332211', 'owner');
  END IF;
  UPDATE employees SET role = 'staff' WHERE role = 'owner' AND id <> v_owner;

  v_staff := public.admin_add_employee('พนักงานรอถูกลบ', '221100', 'staff');

  -- ลบตัวเอง = ล็อกตัวเองออกจากระบบ
  IF public.admin_delete_employee(v_owner, v_owner) <> 'self_delete' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: ลบตัวเองได้';
  END IF;

  -- ลบคนที่ไม่มีจริง
  IF public.admin_delete_employee(2147483600, v_owner) <> 'not_found' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: ลบพนักงานที่ไม่มีจริงไม่ได้คืน not_found';
  END IF;

  -- ลบ owner คนสุดท้าย (สั่งโดยคนอื่น)
  IF public.admin_delete_employee(v_owner, v_staff) <> 'last_owner' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: ลบ owner คนสุดท้ายได้';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = v_owner) THEN
    RAISE EXCEPTION 'ไม่ผ่าน: owner คนสุดท้ายถูกลบจริงในตาราง';
  END IF;

  -- ลบพนักงานทั่วไป → สำเร็จ และแถวหายจริง
  IF public.admin_delete_employee(v_staff, v_owner) <> 'ok' THEN
    RAISE EXCEPTION 'ไม่ผ่าน: ลบพนักงานทั่วไปไม่สำเร็จ';
  END IF;

  SELECT COUNT(*) INTO v_gone FROM employees WHERE id = v_staff;
  IF v_gone <> 0 THEN
    RAISE EXCEPTION 'ไม่ผ่าน: สั่งลบสำเร็จแต่แถวยังอยู่';
  END IF;

  RAISE NOTICE 'PASS  admin_delete_employee · กันลบตัวเอง/owner คนสุดท้าย · ลบพนักงานทั่วไปได้';
END
$$;

ROLLBACK;

\echo ''
\echo '================ admin employees RPC ผ่านครบ ================'
