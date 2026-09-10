-- =============================================================
-- PERF/1 — verify_pin ทางเดินเร็วด้วย pin_lookup
--
-- ครอบ 4 เรื่องที่ต้องไม่พัง:
--   1. เพิ่มพนักงานพร้อม lookup → เก็บลงคอลัมน์จริง และล็อกอินด้วยทางเร็วได้
--   2. แถวเก่าที่ยังไม่มี lookup → ล็อกอินได้ (ทางสำรอง) แล้วถูก backfill ให้
--   3. pepper หมุน (lookup ที่ส่งมาไม่ตรงของเดิม) → ยังล็อกอินได้ และซ่อม lookup ให้
--   4. pin_taken ยังจับ PIN ซ้ำได้ทั้งแถวที่มีและไม่มี lookup
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

-- ให้ทุกเคสเริ่มจากตัวนับ lockout ที่สะอาด
DELETE FROM pin_attempts;

-- -------------------------------------------------------------
-- 1. เพิ่มพนักงานพร้อม lookup → ทางเดินเร็วใช้ได้
-- -------------------------------------------------------------
DO $$
DECLARE
  v_id     INT;
  v_lookup TEXT;
  v_row    RECORD;
BEGIN
  v_id := public.admin_add_employee(
    'ทดสอบ lookup', '918273', 'cashier',
    '00000000-0000-4000-8000-000000000001'::UUID,
    'lookup-918273'
  );
  IF v_id IS NULL OR v_id <= 0 THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: เพิ่มพนักงานไม่สำเร็จ (%)', v_id;
  END IF;

  SELECT e.pin_lookup INTO v_lookup FROM employees e WHERE e.id = v_id;
  IF v_lookup IS DISTINCT FROM 'lookup-918273' THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: admin_add_employee ไม่ได้เขียน pin_lookup (ได้ %)', v_lookup;
  END IF;

  -- PIN ถูก + lookup ถูก → เจอ
  SELECT * INTO v_row FROM public.verify_pin('918273', 'k-fast', 'lookup-918273');
  IF v_row.emp_id IS DISTINCT FROM v_id THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: ทางเดินเร็วหาแถวไม่เจอ';
  END IF;

  -- PIN ผิด + lookup ที่ตรงกับคนนั้น → ต้องไม่เจอ (bcrypt ยังเป็นตัวตัดสิน)
  SELECT * INTO v_row FROM public.verify_pin('000111', 'k-wrongpin', 'lookup-918273');
  IF v_row.emp_id IS NOT NULL THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: lookup ตรงแต่ PIN ผิดกลับล็อกอินได้ — bcrypt ถูกข้าม';
  END IF;

  RAISE NOTICE 'PASS  PERF/1 · ทางเดินเร็ว: lookup หาแถว · bcrypt ตัดสิน';
END
$$;

DELETE FROM pin_attempts;

-- -------------------------------------------------------------
-- 2. แถวเก่าที่ยังไม่มี lookup → ล็อกอินได้ แล้วถูก backfill
-- -------------------------------------------------------------
DO $$
DECLARE
  v_id     INT;
  v_lookup TEXT;
  v_row    RECORD;
BEGIN
  v_id := public.admin_add_employee(
    'ทดสอบ legacy', '827364', 'cashier',
    '00000000-0000-4000-8000-000000000001'::UUID,
    NULL
  );

  SELECT e.pin_lookup INTO v_lookup FROM employees e WHERE e.id = v_id;
  IF v_lookup IS NOT NULL THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: ควรยังไม่มี lookup (ได้ %)', v_lookup;
  END IF;

  SELECT * INTO v_row FROM public.verify_pin('827364', 'k-legacy', 'lookup-827364');
  IF v_row.emp_id IS DISTINCT FROM v_id THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: แถวที่ยังไม่มี lookup ล็อกอินไม่ได้ (ทางสำรองพัง)';
  END IF;

  SELECT e.pin_lookup INTO v_lookup FROM employees e WHERE e.id = v_id;
  IF v_lookup IS DISTINCT FROM 'lookup-827364' THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: ล็อกอินสำเร็จแล้วไม่ได้ backfill pin_lookup (ได้ %)', v_lookup;
  END IF;

  RAISE NOTICE 'PASS  PERF/1 · แถวเก่าล็อกอินได้และถูก backfill อัตโนมัติ';
END
$$;

DELETE FROM pin_attempts;

-- -------------------------------------------------------------
-- 3. pepper หมุน → lookup เดิมใช้ไม่ได้ แต่ต้องไม่ล็อกใครออกจากระบบ
-- -------------------------------------------------------------
DO $$
DECLARE
  v_id     INT;
  v_lookup TEXT;
  v_row    RECORD;
BEGIN
  v_id := public.admin_add_employee(
    'ทดสอบหมุน pepper', '736455', 'cashier',
    '00000000-0000-4000-8000-000000000001'::UUID,
    'lookup-เก่า-736455'
  );

  -- ส่ง lookup ที่คำนวณจาก pepper ตัวใหม่ ซึ่งไม่ตรงกับที่เก็บไว้
  SELECT * INTO v_row FROM public.verify_pin('736455', 'k-rotate', 'lookup-ใหม่-736455');
  IF v_row.emp_id IS DISTINCT FROM v_id THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: หมุน pepper แล้วล็อกอินไม่ได้ — ทั้งร้านจะถูกล็อกออก';
  END IF;

  SELECT e.pin_lookup INTO v_lookup FROM employees e WHERE e.id = v_id;
  IF v_lookup IS DISTINCT FROM 'lookup-ใหม่-736455' THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: หมุน pepper แล้วไม่ได้ซ่อม lookup ให้ (ได้ %)', v_lookup;
  END IF;

  RAISE NOTICE 'PASS  PERF/1 · หมุน pepper แล้วระบบซ่อม lookup ให้เองตอนล็อกอิน';
END
$$;

DELETE FROM pin_attempts;

-- -------------------------------------------------------------
-- 4. pin_taken ยังจับ PIN ซ้ำได้ทั้งสองแบบ
-- -------------------------------------------------------------
DO $$
DECLARE v_with INT; v_without INT; v_dup INT;
BEGIN
  v_with := public.admin_add_employee(
    'ซ้ำ-มี lookup', '645544', 'cashier',
    '00000000-0000-4000-8000-000000000001'::UUID, 'lookup-645544');
  v_without := public.admin_add_employee(
    'ซ้ำ-ไม่มี lookup', '554433', 'cashier',
    '00000000-0000-4000-8000-000000000001'::UUID, NULL);

  -- ซ้ำกับแถวที่มี lookup — เจอผ่าน index
  IF NOT public.pin_taken('645544', NULL, 'lookup-645544') THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: pin_taken ไม่เจอ PIN ซ้ำผ่าน lookup';
  END IF;

  -- ซ้ำกับแถวที่ยังไม่มี lookup — ต้องเจอผ่าน bcrypt
  IF NOT public.pin_taken('554433', NULL, 'lookup-554433') THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: pin_taken พลาดแถวที่ยังไม่มี lookup — PIN ซ้ำจะหลุดเข้าไปได้';
  END IF;

  -- exclude ตัวเองแล้วต้องไม่นับว่าซ้ำ
  IF public.pin_taken('645544', v_with, 'lookup-645544') THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: pin_taken ไม่เคารพ p_exclude_id';
  END IF;

  -- เพิ่มคนใหม่ด้วย PIN ที่ซ้ำกับแถวไม่มี lookup → ต้องถูกปฏิเสธ
  v_dup := public.admin_add_employee(
    'ซ้ำซ้อน', '554433', 'cashier',
    '00000000-0000-4000-8000-000000000001'::UUID, 'lookup-554433');
  IF v_dup <> -1 THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: เพิ่มพนักงานด้วย PIN ซ้ำสำเร็จ (ได้ %)', v_dup;
  END IF;

  RAISE NOTICE 'PASS  PERF/1 · pin_taken จับ PIN ซ้ำได้ทั้งแถวที่มีและไม่มี lookup';
END
$$;

-- -------------------------------------------------------------
-- 5. index ที่ทางเดินเร็วพึ่งอยู่ต้องมีจริง
-- -------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_employees_pin_lookup'
  ) THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: ไม่มี idx_employees_pin_lookup — ทางเดินเร็วกลายเป็น seq scan';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_employees_pin_bcrypt'
  ) THEN
    RAISE EXCEPTION 'PERF/1 ไม่ผ่าน: idx_employees_pin_bcrypt ยังอยู่ (index ที่ไม่มีวันถูกใช้)';
  END IF;

  RAISE NOTICE 'PASS  PERF/1 · index ถูกต้อง';
END
$$;

ROLLBACK;

\echo ''
\echo '================ pin_lookup fast path ผ่านครบ ================'
