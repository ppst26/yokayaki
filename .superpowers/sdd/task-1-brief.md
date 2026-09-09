### Task 1: Migration 5a — role enum (`staff` → `cashier`)

**Files:**
- Create: `supabase/migrations/20260911_m5_roles_enum.sql`

**Interfaces:**
- Produces: `employees.role` CHECK 5 ค่า · ไม่มีแถว `staff` · `admin_add_employee` / `admin_update_employee` รับ role ใหม่

- [ ] **Step 1: สร้าง migration**

```sql
BEGIN;

UPDATE public.employees SET role = 'cashier' WHERE role = 'staff';

ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check
  CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen', 'accountant'));

-- อัปเดต admin_add_employee / admin_update_employee (copy body จาก 20260909 แล้วแก้บรรทัด role check)
-- เปลี่ยนทุก: IF p_role NOT IN ('owner', 'staff')
-- เป็น:     IF p_role NOT IN ('owner', 'manager', 'cashier', 'kitchen', 'accountant')

-- admin_update_employee: กันลด owner คนสุดท้าย — เปลี่ยนเงื่อนไข p_role = 'staff'
-- เป็น: p_role NOT IN ('owner', 'manager') เมื่อ v_current_role = 'owner'

REVOKE EXECUTE ON FUNCTION public.admin_add_employee(TEXT,TEXT,TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_employee(TEXT,TEXT,TEXT,UUID) TO service_role;

COMMIT;
```

- [ ] **Step 2: `pnpm db:reset`**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260911_m5_roles_enum.sql
git commit -m "feat(db): M5 5a migrate staff to cashier and five roles"
```

---

