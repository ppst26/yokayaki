-- =============================================================
-- ผูก auth user superadmin@gmail.com กับ employee 17 (role: owner)
-- =============================================================

BEGIN;

-- อัปเดตชื่อและ auth_user_id ให้ employee 17
UPDATE public.employees
SET name = 'superadmin',
    auth_user_id = '2287693d-dc1e-4b18-9e0e-d917f423d8b9'
WHERE id = 17;

-- บันทึก membership ให้ superadmin
INSERT INTO public.memberships (auth_user_id, org_id, employee_id, role)
VALUES (
  '2287693d-dc1e-4b18-9e0e-d917f423d8b9',
  '00000000-0000-4000-8000-000000000001',
  17,
  'owner'
)
ON CONFLICT (auth_user_id, org_id)
DO UPDATE SET employee_id = 17, role = 'owner';

COMMIT;
