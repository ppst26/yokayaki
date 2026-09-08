-- =============================================================
-- M6 / G2 — compute_member_tags
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

-- -------------------------------------------------------------
-- G2-1 — dormant: ไม่มา ≥30 วัน
-- -------------------------------------------------------------
DO $$
DECLARE
  v_tags JSONB;
BEGIN
  v_tags := public.compute_member_tags(
    5,
    10000,
    NOW() - INTERVAL '31 days',
    NOW() - INTERVAL '90 days'
  );

  IF v_tags <> '["dormant"]'::JSONB THEN
    RAISE EXCEPTION 'G2-1 ไม่ผ่าน: ควรได้ dormant เท่านั้น ได้ %', v_tags;
  END IF;

  RAISE NOTICE 'PASS  G2-1 · dormant เมื่อไม่มา ≥30 วัน';
END
$$;

-- -------------------------------------------------------------
-- G2-2 — new: มา ≤1 ครั้ง และยัง active
-- -------------------------------------------------------------
DO $$
DECLARE
  v_tags JSONB;
BEGIN
  v_tags := public.compute_member_tags(1, 500, NOW() - INTERVAL '3 days', NOW() - INTERVAL '10 days');

  IF NOT v_tags ? 'new' OR v_tags ? 'dormant' THEN
    RAISE EXCEPTION 'G2-2 ไม่ผ่าน: ควรได้ new ได้ %', v_tags;
  END IF;

  RAISE NOTICE 'PASS  G2-2 · new เมื่อมา 1 ครั้งล่าสุด';
END
$$;

-- -------------------------------------------------------------
-- G2-3 — regular + vip: มา ≥2 ครั้ง · ยอดสูง
-- -------------------------------------------------------------
DO $$
DECLARE
  v_tags JSONB;
BEGIN
  v_tags := public.compute_member_tags(10, 5000, NOW() - INTERVAL '2 days', NOW() - INTERVAL '180 days');

  IF NOT (v_tags ? 'regular' AND v_tags ? 'vip') OR v_tags ? 'dormant' THEN
    RAISE EXCEPTION 'G2-3 ไม่ผ่าน: ควรได้ regular+vip ได้ %', v_tags;
  END IF;

  RAISE NOTICE 'PASS  G2-3 · regular + vip';
END
$$;

-- -------------------------------------------------------------
-- G2-4 — dormant จากลงทะเบียนแต่ไม่มีบิล ≥30 วัน
-- -------------------------------------------------------------
DO $$
DECLARE
  v_tags JSONB;
BEGIN
  v_tags := public.compute_member_tags(0, 0, NULL, NOW() - INTERVAL '45 days');

  IF v_tags <> '["dormant"]'::JSONB THEN
    RAISE EXCEPTION 'G2-4 ไม่ผ่าน: ไม่มีบิลเก่า ≥30 วัน ควร dormant ได้ %', v_tags;
  END IF;

  RAISE NOTICE 'PASS  G2-4 · dormant เมื่อลงทะเบียนแต่ไม่มา';
END
$$;

-- -------------------------------------------------------------
-- G2-5 — get_member_profile คืน tags
-- -------------------------------------------------------------
DO $$
DECLARE
  v_phone   TEXT := '0888888882';
  v_profile JSONB;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"emp_id":1,"emp_name":"เจ้าของร้าน","emp_role":"owner","org_id":"00000000-0000-4000-8000-000000000001"}', TRUE);

  INSERT INTO loyalty_members (org_id, phone_number, name, points, created_at)
  VALUES (
    '00000000-0000-4000-8000-000000000001',
    v_phone,
    'สมาชิกแท็ก',
    0,
    NOW() - INTERVAL '5 days'
  )
  ON CONFLICT (org_id, phone_number) DO UPDATE
    SET created_at = NOW() - INTERVAL '5 days';

  v_profile := public.get_member_profile(v_phone);

  IF NOT (v_profile -> 'tags' ? 'new') THEN
    RAISE EXCEPTION 'G2-5 ไม่ผ่าน: profile ควรมีแท็ก new ได้ %', v_profile -> 'tags';
  END IF;

  RAISE NOTICE 'PASS  G2-5 · get_member_profile มี tags';
END
$$;

ROLLBACK;
