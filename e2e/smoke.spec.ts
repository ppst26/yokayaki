import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('หน้าแรกโหลดและแสดงหน้าเข้าสู่ระบบ', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByAltText(/yo-yaki|yokayaki/i).first()).toBeVisible({ timeout: 15_000 });
    const pinKey = page.getByRole('button', { name: '1', exact: true });
    const orgLogin = page.getByText(/เข้าสู่ระบบองค์กรก่อนใช้ PIN/i);
    await expect(pinKey.or(orgLogin)).toBeVisible({ timeout: 15_000 });
  });
});
