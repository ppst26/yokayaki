import type { Page } from '@playwright/test';

/** กด PIN 6 หลักผ่านปุ่มตัวเลขบน PinPad */
export async function enterPin(page: Page, pin: string): Promise<void> {
  if (!/^\d{6}$/.test(pin)) {
    throw new Error('PIN ต้องเป็นตัวเลข 6 หลัก');
  }
  for (const digit of pin) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
}
