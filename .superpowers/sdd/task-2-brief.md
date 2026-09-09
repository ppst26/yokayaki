### Task 2: Migration 5a — permission helpers

**Files:**
- Create: `supabase/migrations/20260912_m5_permission_helpers.sql`

**Interfaces:**
- Produces: `can_operate_pos()`, `can_kitchen()`, `can_read_sales()`, `can_write_catalog()`, `can_manage_stock()`, `can_manage_loyalty()`, `can_manage_employees()`, `can_read_org_settings()`

- [ ] **Step 1: สร้าง helpers**

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.can_operate_pos() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager', 'cashier');
$$;

CREATE OR REPLACE FUNCTION public.can_kitchen() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager', 'cashier', 'kitchen');
$$;

CREATE OR REPLACE FUNCTION public.can_read_sales() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager', 'accountant');
$$;

CREATE OR REPLACE FUNCTION public.can_write_catalog() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_stock() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_loyalty() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_employees() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.can_read_org_settings() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.can_operate_pos() OR public.can_read_sales() OR public.can_kitchen();
$$;

REVOKE EXECUTE ON FUNCTION
  public.can_operate_pos(), public.can_kitchen(), public.can_read_sales(),
  public.can_write_catalog(), public.can_manage_stock(), public.can_manage_loyalty(),
  public.can_manage_employees(), public.can_read_org_settings()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.can_operate_pos(), public.can_kitchen(), public.can_read_sales(),
  public.can_write_catalog(), public.can_manage_stock(), public.can_manage_loyalty(),
  public.can_manage_employees(), public.can_read_org_settings()
TO authenticated, service_role;

-- อัปเดต is_staff / is_owner ให้ delegate (ช่วงเปลี่ยนผ่าน — tests เก่าอาจเรียก)
CREATE OR REPLACE FUNCTION public.is_staff() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.can_operate_pos() OR public.can_kitchen() OR public.can_read_sales();
$$;

CREATE OR REPLACE FUNCTION public.is_owner() RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.jwt_emp_role() IN ('owner', 'manager');
$$;

COMMIT;
```

- [ ] **Step 2: `pnpm db:reset` · Commit** `feat(db): M5 permission helper functions`

---

