import type { Page } from '@playwright/test';

/** กรอกฟอร์ม org login (Supabase Auth) */
export async function enterOrgLogin(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel('อีเมล').fill(email);
  await page.getByLabel('รหัสผ่าน').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบองค์กร' }).click();
  await page.getByText(/กรุณาใส่รหัส PIN/i).waitFor({ timeout: 20_000 });
}
