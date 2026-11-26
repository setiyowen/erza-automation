/**
 * Erza AI — Auto Login + Auto Signup
 * 
 * Usage:
 *   npx playwright test tests/auth.auto.spec.ts --project=chromium
 * 
 * Env:
 *   ERZA_EMAIL      - email untuk login/signup
 *   ERZA_PASSWORD   - password
 *   ERZA_NAME       - nama untuk signup (default: "QA User")
 *   ERZA_BASE_URL   - base URL (default: https://dev.erza.ai)
 * 
 * Behavior:
 *   1. Go to /en/login
 *   2. Try fill email/password + submit
 *   3. If login fails (invalid credentials / user not found):
 *      → Go to /en/signup
 *      → Fill email, password, name
 *      → Submit signup
 *      → If signup fails (email not allowed / already exists):
 *         → Fallback: go back to login, try again
 *   4. On success: save storageState to .auth/user.json
 *   5. Other tests use storageState to skip login
 */

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Ensure .auth/ exists so storageState({ path }) can write into it
mkdirSync(join(process.cwd(), '.auth'), { recursive: true });

const AUTH_FILE = '.auth/user.json';
const BASE = process.env.ERZA_BASE_URL || 'https://dev.erza.ai';
const EMAIL = process.env.ERZA_EMAIL;
const PASSWORD = process.env.ERZA_PASSWORD;
const NAME = process.env.ERZA_NAME || 'QA User';

if (!EMAIL || !PASSWORD) {
  throw new Error('Set ERZA_EMAIL and ERZA_PASSWORD env vars');
}

test.describe.configure({ retries: 0 });

test('auto login + auto signup', async ({ page, context }) => {
  // Helper: wait for navigation or network idle
  const waitLoad = () => page.waitForLoadState('networkidle');

  // ---- STEP 1: Try Login ----
  console.log('🔐 Attempting login...');
  await page.goto(`${BASE}/en/login`, { waitUntil: 'networkidle' });
  await waitLoad();

  // Wait for form to render (SPA)
  await page.waitForSelector('input[type="email"], input[name="email"], input[autocomplete="email"]', {
    state: 'visible',
    timeout: 15000
  });

  const emailInput = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first();
  const passInput = page.locator('input[type="password"], input[name="password"], input[autocomplete="current-password"]').first();
  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Masuk")').first();

  await emailInput.fill(EMAIL);
  await passInput.fill(PASSWORD);
  await submitBtn.click();

  // Wait for either success (redirect to dashboard) or error
  try {
    await page.waitForURL(`${BASE}/**`, { timeout: 10000 });
    // Check if we're logged in (dashboard, articles, etc.)
    const url = page.url();
    if (!url.includes('/login') && !url.includes('/signup')) {
      console.log('✅ Login successful');
      await context.storageState({ path: AUTH_FILE });
      console.log('💾 Saved storageState to ' + AUTH_FILE);
      return;
    }
  } catch {
    // Login didn't redirect — check for error message
  }

  // Check for "invalid credentials" or "user not found" error
  const errorText = await page.locator('text=/invalid|incorrect|not found|salah|tidak ditemukan/i').first().textContent().catch(() => null);
  if (errorText) {
    console.log(`⚠️ Login failed: ${errorText.trim()}`);
  } else {
    console.log('⚠️ Login did not succeed (no redirect, no error)');
  }

  // ---- STEP 2: Try Signup ----
  console.log('📝 Attempting signup...');
  await page.goto(`${BASE}/en/signup`, { waitUntil: 'networkidle' });
  await waitLoad();

  await page.waitForSelector('input[type="email"], input[name="email"], input[autocomplete="email"]', {
    state: 'visible',
    timeout: 15000
  });

  const sEmail = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first();
  const sPass = page.locator('input[type="password"], input[name="password"], input[autocomplete="new-password"]').first();
  const sName = page.locator('input[name="name"], input[autocomplete="name"]').first();
  const sSubmit = page.locator('button[type="submit"], button:has-text("Sign up"), button:has-text("Register"), button:has-text("Daftar")').first();

  await sEmail.fill(EMAIL);
  await sPass.fill(PASSWORD);
  if (await sName.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sName.fill(NAME);
  }
  await sSubmit.click();

  // Wait for success or error
  try {
    await page.waitForURL(`${BASE}/**`, { timeout: 15000 });
    const url = page.url();
    if (!url.includes('/login') && !url.includes('/signup')) {
      console.log('✅ Signup + auto-login successful');
      await context.storageState({ path: AUTH_FILE });
      console.log('💾 Saved storageState to ' + AUTH_FILE);
      return;
    }
  } catch {
    // Signup didn't redirect
  }

  // Check for signup errors
  const signupError = await page.locator('text=/not allowed|already|exists|sudah|terdaftar/i').first().textContent().catch(() => null);
  if (signupError) {
    console.log(`⚠️ Signup failed: ${signupError.trim()}`);
    console.log('ℹ️ This domain may be on allowlist only — falling back to login retry');
  }

  // ---- STEP 3: Fallback — retry login (maybe account was created) ----
  console.log('🔁 Retrying login after signup attempt...');
  await page.goto(`${BASE}/en/login`, { waitUntil: 'networkidle' });
  await waitLoad();

  await emailInput.fill(EMAIL);
  await passInput.fill(PASSWORD);
  await submitBtn.click();

  try {
    await page.waitForURL(`${BASE}/**`, { timeout: 10000 });
    const url = page.url();
    if (!url.includes('/login') && !url.includes('/signup')) {
      console.log('✅ Login successful on retry');
      await context.storageState({ path: AUTH_FILE });
      console.log('💾 Saved storageState to ' + AUTH_FILE);
      return;
    }
  } catch {
    /* final fail */
  }

  // Final fail
  const finalUrl = page.url();
  throw new Error(`Authentication failed. Final URL: ${finalUrl}\nEmail: ${EMAIL}\nCheck: allowlist, credentials, or manual login first.`);
});