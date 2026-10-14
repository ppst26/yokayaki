-- =============================================================
-- ผูก auth user yoyaki@gmail.com กับ employee 21 (role: owner, PIN: 778899)
-- =============================================================

BEGIN;

-- อัปเดต auth_user_id ให้ employee 21 (Yoyaki)
UPDATE public.employees
SET name = 'Yoyaki',
    auth_user_id = '69418384-7231-4830-906c-dbdee2124f05'
WHERE id = 21;

-- บันทึก membership ให้ yoyaki@gmail.com
INSERT INTO public.memberships (auth_user_id, org_id, employee_id, role)
VALUES (
  '69418384-7231-4830-906c-dbdee2124f05',
  '00000000-0000-4000-8000-000000000001',
  21,
  'owner'
)
ON CONFLICT (auth_user_id, org_id)
DO UPDATE SET employee_id = 21, role = 'owner';

COMMIT;
