# erza-automation

QA suite untuk **Erza AI** — gabungan k6 (API + load/streaming) dan Playwright (E2E dengan **auto-login & auto-signup**).

Target lingkungan dev: `dev.erza.ai` (frontend), `api.dev.erza.ai` (API), `ai.dev.erza.ai` (streaming).

## Struktur
```
index.js                    # runner k6 (npm run test)
k6/
  api/auth/login.js         # login → Bearer access_token (pola asli performance/)
  api/core/collection/      # CRUD /api/collections
  api/core/user/            # /api/users
  test/core/{user,collection}/  # test case per resource (k6chaijs)
  test/index.js             # scenario runner (per-vu-iterations)
  smoke.js                  # smoke: login → profile + collections
  load/load_test.js         # load: SSE streaming template stream (X-API-Key)
tests/
  auth.auto.spec.ts         # Playwright: AUTO LOGIN → AUTO SIGNUP → save storageState
  e2e.authenticated.spec.ts # Playwright: dashboard, Quick Create, Auto Generate, AI Tools
playwright.config.ts        # project auth → chromium (pakai .auth/user.json)
.github/workflows/qa.yml    # CI: playwright-e2e, k6-smoke, k6-load
```

## Setup
```bash
npm install
cp .env.example .env        # isi AUTH_*, BASE_URL, API_KEY, ERZA_*
npx playwright install chromium
```

## Jalankan

### Auto Login + Signup + E2E (Playwright)
```bash
# login otomatis; jika akun belum ada → signup otomatis; hasil disimpan ke .auth/user.json
npx playwright test --project=auth
# E2E memakai session tersimpan
npx playwright test --project=chromium
# atau sekaligus (auth → chromium)
npx playwright test
```
Hanya 2 input dari kamu: `ERZA_EMAIL` + `ERZA_PASSWORD`. Jika form login gagal (akun belum ada), otomatis buka form daftar dan submit. Jika domain tidak di-allowlist, gagal dengan pesan jelas.

### k6 API / Load
```bash
npm run test                 # test functional (login + collection + user)
k6 run k6/smoke.js           # smoke
k6 run k6/load/load_test.js  # load streaming (butuh API_KEY)
```

## Catatan penting
- **Signup pakai allowlist** — API `sign-up/email` menolak email di luar domain yang di-approve (kode 422 "Email not allowed"). Auto-signup hanya berhasil untuk akun yang belum dibuat tapi domain-nya boleh.
- **Streaming di host terpisah** (`ai.dev.erza.ai`) memakai `X-API-Key`, bukan Bearer.
- Kredential tidak pernah di-commit (`.env`, `.auth/` ada di `.gitignore`).