### Task 3: JWT login — `org_id` claim

**Files:**
- Modify: `lib/authToken.ts`
- Modify: `app/api/auth/login/route.ts`
- Test: `lib/authToken.test.ts` (สร้างใหม่)

**Interfaces:**
- Produces:
  - `StaffClaims.orgId: string`
  - JWT payload `org_id: string` (UUID)
  - `verifyStaffToken()` คืน `orgId` หรือ `null` ถ้าไม่มี claim

- [ ] **Step 1: เขียน failing test**

สร้าง `lib/authToken.test.ts`:

```ts
import { describe, expect, it, beforeAll } from 'vitest';
import { signStaffToken, verifyStaffToken } from '@/lib/authToken';

const ORG = '00000000-0000-4000-8000-000000000001';

beforeAll(() => {
  if (!process.env.SUPABASE_JWT_SECRET && !process.env.SUPABASE_JWT_SIGNING_JWK) {
    process.env.SUPABASE_JWT_SECRET = 'test-secret-at-least-32-chars-long!!';
  }
});

describe('signStaffToken', () => {
  it('ใส่ org_id ใน JWT', async () => {
    const token = await signStaffToken({
      empId: 1,
      empName: 'ทดสอบ',
      empRole: 'owner',
      orgId: ORG,
    });
    const claims = await verifyStaffToken(token);
    expect(claims?.orgId).toBe(ORG);
  });
});
```

- [ ] **Step 2: รันให้ล้ม**

```bash
pnpm test:unit lib/authToken.test.ts
```

Expected: FAIL — `orgId` ไม่มีใน type หรือ verify คืน undefined

- [ ] **Step 3: แก้ `lib/authToken.ts`**

```ts
export interface StaffClaims {
  empId: number;
  empName: string;
  empRole: EmployeeRole;
  orgId: string;
}

// ใน signStaffToken:
  return new SignJWT({
    role: 'authenticated',
    emp_id: claims.empId,
    emp_name: claims.empName,
    emp_role: claims.empRole,
    org_id: claims.orgId,
  })

// ใน verifyStaffToken:
    const orgId = payload.org_id;
    if (typeof orgId !== 'string' || !orgId) return null;

    return {
      empId,
      empName: typeof empName === 'string' ? empName : '',
      empRole,
      orgId,
    };
```

- [ ] **Step 4: แก้ `app/api/auth/login/route.ts`**

หลัง verify_pin สำเร็จ อ่าน `org_id`:

```ts
    const { data: empRow, error: empError } = await supabaseAdmin
      .from('employees')
      .select('org_id')
      .eq('id', row.emp_id)
      .single();

    if (empError || !empRow?.org_id) {
      return Response.json({ error: 'ไม่พบข้อมูลองค์กรของพนักงาน' }, { status: 500 });
    }

    const token = await signStaffToken({
      empId: employee.id,
      empName: employee.name,
      empRole: employee.role,
      orgId: empRow.org_id,
    });
```

- [ ] **Step 5: รัน unit test**

```bash
pnpm test:unit lib/authToken.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/authToken.ts lib/authToken.test.ts app/api/auth/login/route.ts
git commit -m "feat(auth): add org_id to staff JWT at login"
```

---

