import { test, expect } from '@playwright/test';
import { enterPin } from './helpers/pin';
import { goToFloorTab, goToKitchenTab } from './helpers/nav';
import { isRealSupabaseConfigured, resolveAppEnv } from './helpers/env';

const appEnv = resolveAppEnv();
const canRun = isRealSupabaseConfigured(appEnv);

const staffPin = process.env.E2E_STAFF_PIN ?? '111111';

test.describe('full POS flow', () => {
  test.describe.configure({ mode: 'serial', timeout: 90_000 });

  test.skip(!canRun, 'ต้องตั้ง Supabase env จริง (ไม่ใช่ placeholder) — ดู .env.example');

  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
  });

  test('ล็อกอิน → สั่ง → เสิร์ฟครัว → เช็คบิล', async ({ page }) => {
    await page.goto('/');
    await enterPin(page, staffPin);

    await expect(page.getByRole('heading', { name: 'ผังโต๊ะ' })).toBeVisible({ timeout: 20_000 });

    // เลือกโต๊ะว่างแรกที่เจอ
    const vacantTable = page.getByRole('button', { name: /เปิดออเดอร์ใหม่/ }).first();
    await expect(vacantTable).toBeVisible({ timeout: 15_000 });
    await vacantTable.click();

    const tableLabel = await page.getByText(/ประจำ\s+โต๊ะ\s+\d+/).first().textContent();
    const tableIdMatch = tableLabel?.match(/โต๊ะ\s+(\d+)/);
    const tableId = tableIdMatch?.[1] ?? '4';

    await expect(page.getByText('สั่งอาหาร', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // เมนูแรกที่ยังมีสต็อก (ปุ่มที่มี "เหลือ")
    const menuItem = page.locator('button').filter({ hasText: 'เหลือ' }).first();
    await expect(menuItem).toBeVisible({ timeout: 20_000 });
    await menuItem.click();

    await page.getByRole('button', { name: /ส่งเข้าครัว/ }).click();

    await goToFloorTab(page);
    await expect(page.getByRole('heading', { name: 'ผังโต๊ะ' })).toBeVisible();

    await goToKitchenTab(page);
    const serveAll = page.getByRole('button', { name: new RegExp(`เสิร์ฟทั้งหมดของโต๊ะ ${tableId}`) });
    await expect(serveAll).toBeVisible({ timeout: 20_000 });
    await serveAll.click();
    await expect(serveAll).toBeHidden({ timeout: 20_000 });

    await goToFloorTab(page);
    await page.getByRole('button', { name: new RegExp(`โต๊ะ ${tableId}`) }).click();
    await page.getByRole('button', { name: /ชำระเงิน \/ เช็คบิล/ }).click();

    await expect(page.getByText('ชำระเงิน', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'เต็มจำนวน' }).click();
    await page.getByRole('button', { name: /ยืนยันรับชำระเงิน/ }).click();

    await expect(page.getByRole('button', { name: 'พิมพ์ใบเสร็จ' })).toBeVisible({ timeout: 20_000 });
  });
});
