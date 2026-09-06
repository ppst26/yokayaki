-- =============================================================
-- M5 / 5c — staff_sessions + login_audit
--
--   pnpm db:test
-- =============================================================

\set ON_ERROR_STOP on
\timing off
BEGIN;

-- -------------------------------------------------------------
-- สิทธิ์ anon/authenticated ต้องไม่แตะตาราง session/audit
-- -------------------------------------------------------------
DO $$
BEGIN
  IF has_table_privilege('anon', 'staff_sessions', 'SELECT') THEN
    RAISE EXCEPTION 'anon ต้องไม่มีสิทธิ์ staff_sessions';
  END IF;
  IF has_table_privilege('authenticated', 'staff_sessions', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated ต้องไม่มีสิทธิ์ staff_sessions';
  END IF;
  IF has_table_privilege('anon', 'login_audit', 'SELECT') THEN
    RAISE EXCEPTION 'anon ต้องไม่มีสิทธิ์ login_audit';
  END IF;
  IF has_table_privilege('authenticated', 'login_audit', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated ต้องไม่มีสิทธิ์ login_audit';
  END IF;
  RAISE NOTICE 'PASS  staff_sessions · anon/authenticated ไม่มี grant';
END
$$;

-- -------------------------------------------------------------
-- สร้าง session → revoke → ไม่ active (mirror getStaffSession check)
-- -------------------------------------------------------------
DO $$
DECLARE
  v_org_id   UUID := '00000000-0000-4000-8000-000000000001';
  v_emp_id   INT;
  v_session  UUID;
  v_active   INT;
  v_audit    INT;
BEGIN
  SELECT id INTO v_emp_id FROM employees WHERE org_id = v_org_id AND role = 'owner' LIMIT 1;
  IF v_emp_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบ owner seed ใน org default';
  END IF;

  INSERT INTO staff_sessions (employee_id, org_id, expires_at, device_hint)
  VALUES (v_emp_id, v_org_id, now() + interval '8 hours', 'test-agent')
  RETURNING id INTO v_session;

  SELECT COUNT(*) INTO v_active
  FROM staff_sessions
  WHERE id = v_session
    AND revoked_at IS NULL
    AND expires_at > now();

  IF v_active <> 1 THEN
    RAISE EXCEPTION 'session ที่สร้างใหม่ต้อง active';
  END IF;

  UPDATE staff_sessions SET revoked_at = now() WHERE id = v_session;

  SELECT COUNT(*) INTO v_active
  FROM staff_sessions
  WHERE id = v_session
    AND revoked_at IS NULL
    AND expires_at > now();

  IF v_active <> 0 THEN
    RAISE EXCEPTION 'หลัง revoke session ต้อง invalid (revoked_at IS NOT NULL)';
  END IF;

  INSERT INTO login_audit (employee_id, org_id, event, ip_hint)
  VALUES (v_emp_id, v_org_id, 'revoke', '127.0.0.1');

  SELECT COUNT(*) INTO v_audit
  FROM login_audit
  WHERE employee_id = v_emp_id AND event = 'revoke';

  IF v_audit < 1 THEN
    RAISE EXCEPTION 'login_audit ต้องบันทึก event revoke ได้';
  END IF;

  RAISE NOTICE 'PASS M5 staff_sessions · revoke แล้ว session invalid';
END
$$;

ROLLBACK;
