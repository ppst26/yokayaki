import type { Page } from '@playwright/test';

/** สลับแท็บหลัก — รองรับข้อความ desktop + mobile */
export async function goToFloorTab(page: Page): Promise<void> {
  await page.getByRole('button', { name: /แผนผังโต๊ะ|ผังโต๊ะ/ }).first().click();
}

export async function goToKitchenTab(page: Page): Promise<void> {
  await page.getByRole('button', { name: /หน้าจอครัว|หน้าครัว/ }).first().click();
}
