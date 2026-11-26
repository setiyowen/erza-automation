import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.ERZA_BASE_URL || 'https://dev.erza.ai',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      // 1. Auto login + auto signup → saves .auth/user.json
      name: 'auth',
      testMatch: /auth\.auto\.spec\.ts/,
      timeout: 120000,  // 2 min for 3-step login→signup→retry
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // 2. Authenticated E2E — runs after auth, loads saved session
      name: 'chromium',
      testMatch: /e2e\.authenticated\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['auth'],
    },
  ],
});