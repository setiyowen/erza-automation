/**
 * Erza AI — Auto Login + Auto Signup
 *
 * Usage:
 *   npx playwright test --project=auth
 *
 * Env:
 *   ERZA_EMAIL     - email untuk login/signup
 *   ERZA_PASSWORD  - password
 *   ERZA_NAME      - nama untuk signup (default: "QA User")
 *   ERZA_BASE_URL  - base URL (default: https://dev.erza.ai)
 *
 * Behavior:
 *   1. Go to /en/signin, fill email/password, submit
 *   2. Verify REAL session by visiting /en/dashboard (must NOT bounce to sign-in)
 *   3. If login fails (user not found / invalid creds) -> /en/signup, fill + submit
 *   4. If signup fails (domain not allowed) -> retry login once
 *   5. On success: save storageState to .auth/user.json
 *      E2E tests reuse that session (chromium project in playwright.config.ts).
 */

import { test, type Page, type BrowserContext } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Ensure .auth/ exists so storageState({ path }) can write into it
mkdirSync(join(process.cwd(), '.auth'), { recursive: true });

const AUTH_FILE = '.auth/user.json';
const BASE = process.env.ERZA_BASE_URL || 'https://dev.erza.ai';
const EMAIL = process.env.ERZA_EMAIL || process.env.AUTH_EMAIL || '';
const PASSWORD = process.env.ERZA_PASSWORD || process.env.AUTH_PASSWORD || '';
const NAME = process.env.ERZA_NAME || 'QA User';

if (!EMAIL || !PASSWORD) {
  throw new Error(
    'Set ERZA_EMAIL and ERZA_PASSWORD env vars (or AUTH_EMAIL/AUTH_PASSWORD)'
  );
}

// ---- Helpers ---------------------------------------------------------------

/** Visit a protected route; a valid session stays, invalid session redirects to signin. */
async function isLoggedIn(page: Page): Promise<boolean> {
  await page
    .goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded' })
    .catch(() => {});
  await page.waitForTimeout(1500);
  const bounced =
    page.url().includes('/signin') || page.url().includes('/signup');
  const hasLoginForm = await page.locator('text=/Welcome back/i').count();
  return !bounced && hasLoginForm === 0;
}

async function doLogin(page: Page): Promise<boolean> {
  await page.goto(`${BASE}/en/signin`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(
    'input[type="email"], input[autocomplete="email"]',
    { timeout: 30000 }
  );
  const emailInput = page
    .locator('input[type="email"], input[autocomplete="email"]')
    .first();
  const passInput = page.locator('input[type="password"]').first();
  const submitBtn = page
    .locator(
      'button[type="submit"], button:has-text("Sign In"), button:has-text("Sign in"), button:has-text("Masuk")'
    )
    .first();

  await emailInput.fill(EMAIL);
  await passInput.fill(PASSWORD);
  await submitBtn.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  return isLoggedIn(page);
}

async function doSignup(page: Page): Promise<boolean> {
  await page.goto(`${BASE}/en/signup`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(
    'input[type="email"], input[autocomplete="email"]',
    { timeout: 30000 }
  );
  const emailInput = page
    .locator('input[type="email"], input[autocomplete="email"]')
    .first();
  const passInput = page.locator('input[type="password"]').first();
  const nameInput = page.locator('input[name="name"], input[autocomplete="name"]');
  const submitBtn = page
    .locator(
      'button[type="submit"], button:has-text("Sign up"), button:has-text("Create"), button:has-text("Register"), button:has-text("Daftar")'
    )
    .first();

  await emailInput.fill(EMAIL);
  await passInput.fill(PASSWORD);
  if (await nameInput.first().isVisible().catch(() => false)) {
    await nameInput.first().fill(NAME);
  }
  await submitBtn.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);

  if (await isLoggedIn(page)) return true;

  const err = await page
    .locator('text=/not allowed|already|exists|invalid|salah|tidak/i')
    .first()
    .textContent()
    .catch(() => null);
  if (err) console.log(`⚠️ Signup error: ${err.trim()}`);
  return false;
}

async function saveSession(context: BrowserContext): Promise<void> {
  await context.storageState({ path: AUTH_FILE });
  console.log(`💾 Saved storageState to ${AUTH_FILE}`);
}

// ---- Test -------------------------------------------------------------------

test('auto login (with auto-signup fallback)', async ({ page, context }) => {
  // STEP 1: try straight login
  console.log(`🔐 Login: ${EMAIL}`);
  if (await doLogin(page)) {
    console.log('✅ Login successful (session verified on /en/dashboard)');
    await saveSession(context);
    return;
  }
  console.log('⚠️ Login did not produce a valid session — trying signup...');

  // STEP 2: signup (create account if missing), then verify session
  if (await doSignup(page)) {
    console.log('✅ Signup successful (session verified)');
    await saveSession(context);
    return;
  }

  // STEP 3: retry login (account may now exist)
  if (await doLogin(page)) {
    console.log('✅ Login successful on retry after signup');
    await saveSession(context);
    return;
  }

  // Final fail — screenshot/video auto-attached by config
  throw new Error(
    `Authentication failed for ${EMAIL}.\n` +
      `Final URL: ${page.url()}\n` +
      'Check: credentials, allowlisted email domain, or run a manual login first.'
  );
});
