import { describe, expect, it, beforeAll } from 'vitest';
import { SignJWT } from 'jose';
import { signStaffToken, verifyStaffToken } from '@/lib/authToken';
import { EMPLOYEE_ROLES } from '@/lib/permissions';

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

  it.each(EMPLOYEE_ROLES)('ยอมรับ role %s', async role => {
    const token = await signStaffToken({
      empId: 1,
      empName: 'ทดสอบ',
      empRole: role,
      orgId: ORG,
    });
    const claims = await verifyStaffToken(token);
    expect(claims?.empRole).toBe(role);
  });

  it('ปฏิเสธ role staff (legacy)', async () => {
    const secret = new TextEncoder().encode(
      process.env.SUPABASE_JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!',
    );
    const token = await new SignJWT({
      role: 'authenticated',
      emp_id: 1,
      emp_name: 'ทดสอบ',
      emp_role: 'staff',
      org_id: ORG,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject('00000000-0000-4000-8000-000000000001')
      .setAudience('authenticated')
      .setIssuer('yokayaki-pos')
      .setExpirationTime('1h')
      .sign(secret);

    expect(await verifyStaffToken(token)).toBeNull();
  });
});
