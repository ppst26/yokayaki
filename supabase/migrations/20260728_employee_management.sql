-- ============================================================
-- Employee Management RPC Functions
-- ============================================================
-- เพิ่ม/แก้ไข/ลบพนักงาน สำหรับ Owner เท่านั้น
-- ทุกฟังก์ชันเป็น SECURITY DEFINER

-- 1. add_employee: เพิ่มพนักงานใหม่
-- Returns: employee id ถ้าสำเร็จ, -1 ถ้า PIN ซ้ำ
CREATE OR REPLACE FUNCTION add_employee(
  p_name TEXT,
  p_pin_hash TEXT,
  p_role TEXT
) RETURNS INT AS $$
DECLARE
  v_existing INT;
  v_new_id INT;
BEGIN
  -- ตรวจสอบ role ถูกต้อง
  IF p_role NOT IN ('owner', 'staff') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- ตรวจสอบชื่อไม่ว่าง
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Name cannot be empty';
  END IF;

  -- ตรวจสอบ PIN ไม่ซ้ำ
  SELECT id INTO v_existing FROM employees WHERE pin_hash = p_pin_hash LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN -1; -- PIN ซ้ำ
  END IF;

  -- เพิ่มพนักงานใหม่
  INSERT INTO employees (name, pin_hash, role)
  VALUES (TRIM(p_name), p_pin_hash, p_role)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. update_employee: แก้ไขข้อมูลพนักงาน
-- ส่ง null ในพารามิเตอร์ที่ไม่ต้องการเปลี่ยน
-- Returns: TRUE ถ้าสำเร็จ
CREATE OR REPLACE FUNCTION update_employee(
  p_employee_id INT,
  p_name TEXT DEFAULT NULL,
  p_pin_hash TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_existing INT;
BEGIN
  -- ตรวจสอบว่าพนักงานมีอยู่จริง
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id) THEN
    RAISE EXCEPTION 'Employee not found: %', p_employee_id;
  END IF;

  -- ตรวจสอบ role ถูกต้อง (ถ้าส่งมา)
  IF p_role IS NOT NULL AND p_role NOT IN ('owner', 'staff') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- ตรวจสอบ PIN ไม่ซ้ำ (ถ้าส่ง pin_hash ใหม่มา)
  IF p_pin_hash IS NOT NULL THEN
    SELECT id INTO v_existing FROM employees
    WHERE pin_hash = p_pin_hash AND id != p_employee_id LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RAISE EXCEPTION 'PIN already exists';
    END IF;
  END IF;

  -- อัปเดตข้อมูล
  UPDATE employees SET
    name = COALESCE(NULLIF(TRIM(COALESCE(p_name, '')), ''), name),
    pin_hash = COALESCE(p_pin_hash, pin_hash),
    role = COALESCE(p_role, role)
  WHERE id = p_employee_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. delete_employee: ลบพนักงาน (ต้องยืนยันตัวตน Owner)
-- Returns: 'ok', 'self_delete', 'not_owner', 'not_found'
CREATE OR REPLACE FUNCTION delete_employee(
  p_employee_id INT,
  p_requester_pin_hash TEXT
) RETURNS TEXT AS $$
DECLARE
  v_requester_id INT;
  v_requester_role TEXT;
BEGIN
  -- ตรวจสอบว่า requester เป็น Owner จริง
  SELECT id, role INTO v_requester_id, v_requester_role
  FROM employees WHERE pin_hash = p_requester_pin_hash LIMIT 1;

  IF v_requester_id IS NULL OR v_requester_role != 'owner' THEN
    RETURN 'not_owner';
  END IF;

  -- ห้ามลบตัวเอง
  IF v_requester_id = p_employee_id THEN
    RETURN 'self_delete';
  END IF;

  -- ตรวจสอบว่าพนักงานที่จะลบมีอยู่จริง
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id) THEN
    RETURN 'not_found';
  END IF;

  -- ลบพนักงาน
  DELETE FROM employees WHERE id = p_employee_id;

  RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
