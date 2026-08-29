import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('หน้าแรกโหลดและแสดง PIN pad', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /yokayaki/i })).toBeVisible();
    await expect(page.getByText(/กรุณาใส่รหัส PIN/i)).toBeVisible();
  });
});
