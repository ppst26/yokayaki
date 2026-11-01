import { test, expect } from '@playwright/test';
import { enterPin } from './helpers/pin';
import { enterOrgLogin } from './helpers/org-login';
import { goToHistoryTab } from './helpers/nav';
import { isRealSupabaseConfigured, resolveAppEnv } from './helpers/env';

const appEnv = resolveAppEnv();
const canRun = isRealSupabaseConfigured(appEnv);

const staffPin = process.env.E2E_STAFF_PIN ?? '111111';
const orgEmail = process.env.E2E_ORG_EMAIL ?? appEnv.E2E_ORG_EMAIL;
const orgPassword = process.env.E2E_ORG_PASSWORD ?? appEnv.E2E_ORG_PASSWORD;

test.describe('Void Bill Flow', () => {
  test.skip(!canRun, 'ต้องตั้ง Supabase env จริง (ไม่ใช่ placeholder) — ดู .env.example');

  test('เปิดประวัติการขาย → เลือกบิล → กดปุ่มยกเลิกบิล → ตรวจสอบการแสดงผล Step-up PIN Modal', async ({ page }) => {
    await page.goto('/');

    if (orgEmail && orgPassword) {
      await enterOrgLogin(page, orgEmail, orgPassword);
    }

    await enterPin(page, staffPin);

    // ตรวจสอบว่าเข้าหน้าหลักสำเร็จ
    await expect(page.getByRole('heading', { name: 'ผังโต๊ะ' })).toBeVisible({ timeout: 20_000 });

    // คลิกแท็บ "ประวัติการขาย / ออเดอร์ประจำวัน"
    await goToHistoryTab(page);

    await expect(page.getByRole('heading', { name: 'ประวัติการขาย' })).toBeVisible({ timeout: 15_000 });

    // ตรวจสอบว่ามีบิลในรายการหรือไม่
    const billCard = page.locator('div').filter({ hasText: /^ORD-\d+/ }).first();
    const hasBills = await billCard.isVisible({ timeout: 8_000 }).catch(() => false);

    if (hasBills) {
      await billCard.click();

      // ตรวจสอบว่าเปิด modal รายละเอียดบิล
      await expect(page.getByText(/รายละเอียดบิล ORD-\d+/)).toBeVisible({ timeout: 10_000 });

      // ตรวจสอบว่ามีปุ่มยกเลิกบิล (ถ้าบิลยังไม่ถูก void) หรือแสดงป้ายยกเลิกแล้ว
      const voidBtn = page.getByRole('button', { name: /ยกเลิกบิลนี้/i });
      const alreadyVoided = page.getByText(/บิลนี้ถูกยกเลิกแล้ว/i);

      await expect(voidBtn.or(alreadyVoided)).toBeVisible({ timeout: 10_000 });

      if (await voidBtn.isVisible()) {
        await voidBtn.click();

        // ตรวจสอบว่าเปิด VoidBillModal พร้อมช่องใส่ Step-up PIN
        await expect(page.getByText('ยกเลิกบิล (Void Bill)')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/Step-up PIN/i)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('button', { name: 'ยืนยันยกเลิกบิล' })).toBeVisible();

        // ปิด modal ยกเลิก
        await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
        await expect(page.getByText('ยกเลิกบิล (Void Bill)')).toBeHidden();
      }
    }
  });
});
