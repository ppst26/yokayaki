BEGIN;

-- =============================================================
-- M5 / 5a — Migrate staff → cashier + five-role enum
-- =============================================================

ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;

UPDATE public.employees SET role = 'cashier' WHERE role = 'staff';

ALTER TABLE public.employees ADD CONSTRAINT employees_role_check
  CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen', 'accountant'));

-- -------------------------------------------------------------
-- admin_add_employee — validate 5 roles
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_add_employee(
  p_name   TEXT,
  p_pin    TEXT,
  p_role   TEXT,
  p_org_id UUID
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
  IF public.pin_taken(p_pin) THEN RETURN -1; END IF;

  INSERT INTO employees (name, role, pin_bcrypt, org_id)
  VALUES (TRIM(p_name), p_role, crypt(p_pin, gen_salt('bf', 10)), p_org_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

COMMENT ON FUNCTION public.admin_add_employee(TEXT, TEXT, TEXT, UUID) IS
  'เพิ่มพนักงานพร้อม org_id — service_role เท่านั้น';

REVOKE EXECUTE ON FUNCTION public.admin_add_employee(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_employee(TEXT, TEXT, TEXT, UUID) TO service_role;

-- -------------------------------------------------------------
-- admin_update_employee — validate 5 roles + last_owner guard
-- -------------------------------------------------------------
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

COMMENT ON FUNCTION public.admin_update_employee(INT, TEXT, TEXT, TEXT) IS
  'แก้ไขพนักงาน — service_role เท่านั้น · กันลดสิทธิ์ owner คนสุดท้าย';

REVOKE EXECUTE ON FUNCTION public.admin_update_employee(INT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_employee(INT, TEXT, TEXT, TEXT) TO service_role;

COMMIT;
