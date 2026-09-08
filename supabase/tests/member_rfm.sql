-- =============================================================
-- M6 / G3 — compute_member_rfm
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

-- -------------------------------------------------------------
-- G3-1 — กลุ่ม A: R≥4 F≥3 M≥3
-- -------------------------------------------------------------
DO $$
DECLARE
  v_rfm JSONB;
BEGIN
  v_rfm := public.compute_member_rfm(10, 8000, NOW() - INTERVAL '5 days', NOW() - INTERVAL '200 days');

  IF (v_rfm ->> 'segment') <> 'A' THEN
    RAISE EXCEPTION 'G3-1 ไม่ผ่าน: ควรเป็นกลุ่ม A ได้ %', v_rfm;
  END IF;

  IF (v_rfm ->> 'r')::INT < 4 OR (v_rfm ->> 'f')::INT < 3 OR (v_rfm ->> 'm')::INT < 3 THEN
    RAISE EXCEPTION 'G3-1 ไม่ผ่าน: คะแนน RFM ไม่ครบเกณฑ์ A ได้ %', v_rfm;
  END IF;

  RAISE NOTICE 'PASS  G3-1 · กลุ่ม A';
END
$$;

-- -------------------------------------------------------------
-- G3-2 — กลุ่ม C: มาน้อย · ยอดต่ำ · หายไปนาน
-- -------------------------------------------------------------
DO $$
DECLARE
  v_rfm JSONB;
BEGIN
  v_rfm := public.compute_member_rfm(1, 100, NOW() - INTERVAL '90 days', NOW() - INTERVAL '120 days');

  IF (v_rfm ->> 'segment') <> 'C' THEN
    RAISE EXCEPTION 'G3-2 ไม่ผ่าน: ควรเป็นกลุ่ม C ได้ %', v_rfm;
  END IF;

  RAISE NOTICE 'PASS  G3-2 · กลุ่ม C';
END
$$;

-- -------------------------------------------------------------
-- G3-3 — days_inactive คำนวณจาก last_visit
-- -------------------------------------------------------------
DO $$
DECLARE
  v_rfm JSONB;
BEGIN
  v_rfm := public.compute_member_rfm(3, 2000, NOW() - INTERVAL '45 days', NOW() - INTERVAL '100 days');

  IF (v_rfm ->> 'days_inactive')::INT < 44 OR (v_rfm ->> 'days_inactive')::INT > 46 THEN
    RAISE EXCEPTION 'G3-3 ไม่ผ่าน: days_inactive ควร ~45 ได้ %', v_rfm ->> 'days_inactive';
  END IF;

  RAISE NOTICE 'PASS  G3-3 · days_inactive';
END
$$;

-- -------------------------------------------------------------
-- G3-4 — list_member_summaries มี rfm
-- -------------------------------------------------------------
DO $$
DECLARE
  v_phone TEXT := '0888888883';
  v_rows  JSONB;
  v_row   JSONB;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  INSERT INTO loyalty_members (org_id, phone_number, name, points, created_at)
  VALUES (
    '00000000-0000-4000-8000-000000000001',
    v_phone,
    'สมาชิก RFM',
    0,
    NOW() - INTERVAL '10 days'
  )
  ON CONFLICT (org_id, phone_number) DO UPDATE SET created_at = NOW() - INTERVAL '10 days';

  v_rows := public.list_member_summaries();

  SELECT elem INTO v_row
  FROM jsonb_array_elements(v_rows) elem
  WHERE elem ->> 'phone_number' = v_phone
  LIMIT 1;

  IF v_row -> 'rfm' IS NULL OR v_row -> 'rfm' ->> 'segment' IS NULL THEN
    RAISE EXCEPTION 'G3-4 ไม่ผ่าน: summary ต้องมี rfm ได้ %', v_row;
  END IF;

  RAISE NOTICE 'PASS  G3-4 · list_member_summaries มี rfm';
END
$$;

ROLLBACK;
