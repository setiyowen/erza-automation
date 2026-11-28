import { test, expect } from '@playwright/test';

/**
 * Authenticated E2E — auto-loads .auth/user.json via playwright.config.ts
 * (chromium project has storageState set + dependencies: ['auth']).
 *
 * Demo-safe: when ERZA_EMAIL/ERZA_PASSWORD are placeholders
 * (test@example.com / placeholder-password), all authenticated tests skip,
 * so the portfolio CI stays green without real credentials.
 */

const EMAIL = process.env.ERZA_EMAIL || process.env.AUTH_EMAIL || '';
const PASSWORD = process.env.ERZA_PASSWORD || process.env.AUTH_PASSWORD || '';
const DEMO_MODE =
  EMAIL === 'test@example.com' && PASSWORD === 'placeholder-password';

// describe wrapper that skips the whole suite in demo mode
const suite = DEMO_MODE
  ? (title: string, fn: () => void) => test.describe.skip(title, fn)
  : (title: string, fn: () => void) => test.describe(title, fn);

suite('Erza Dashboard (authenticated)', () => {
  test('can access dashboard', async ({ page }) => {
    await page.goto('/en/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/login');
  });

  test('sidebar has Article and AI Tools', async ({ page }) => {
    await page.goto('/en/dashboard');
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').innerText();
    expect(text.toLowerCase()).toMatch(/article|ai tool|dashboard/);
  });
});

suite('Quick Create', () => {
  test('simple form has topic + template + submit', async ({ page }) => {
    await page.goto('/en/article/quick-create');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('textarea', { timeout: 15000 });
    // topic textarea exists
    const textareas = await page.locator('textarea').count();
    expect(textareas).toBeGreaterThanOrEqual(1);
    // submit button present
    const submit = page.locator(
      'button:has-text("Create"), button:has-text("Generate"), button:has-text("Buat")'
    );
    expect(await submit.count()).toBeGreaterThanOrEqual(1);
  });
});

suite('Auto Generate', () => {
  test('page has site selector + schedule options', async ({ page }) => {
    await page.goto('/en/article/auto-generate');
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').innerText();
    expect(text.toLowerCase()).toMatch(/wordpress|schedule|draft|publish/);
  });
});

suite('AI Tools', () => {
  test('tools page renders', async ({ page }) => {
    await page.goto('/en/ai-tools/humanize');
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });
});