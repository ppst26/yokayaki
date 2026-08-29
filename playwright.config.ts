import { defineConfig, devices } from '@playwright/test';
import { resolveAppEnv } from './e2e/helpers/env';

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;
const appEnv = resolveAppEnv();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm exec next start -H 127.0.0.1 -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...appEnv,
      NODE_ENV: 'production',
    },
  },
});
