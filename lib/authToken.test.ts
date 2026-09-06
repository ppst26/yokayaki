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
