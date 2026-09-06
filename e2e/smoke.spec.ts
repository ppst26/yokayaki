import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('หน้าแรกโหลดและแสดงหน้าเข้าสู่ระบบ', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /yokayaki/i })).toBeVisible();
    const pinPad = page.getByText(/กรุณาใส่รหัส PIN/i);
    const orgLogin = page.getByText(/เข้าสู่ระบบองค์กรก่อนใช้ PIN/i);
    await expect(pinPad.or(orgLogin)).toBeVisible();
  });
});
