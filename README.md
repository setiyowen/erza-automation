# erza-automation

QA suite untuk **Erza AI** — gabungan k6 (API + load/streaming) dan Playwright (E2E dengan **auto-login & auto-signup**).

Target lingkungan dev: `dev.erza.ai` (frontend), `api.dev.erza.ai` (API), `ai.dev.erza.ai` (streaming).

## ⚡ Portfolio / Demo Mode (CI green tanpa kredensial asli)

```bash
# Gunakan placeholder di .env atau GitHub Secrets
ERZA_EMAIL="test@example.com"
ERZA_PASSWORD="placeholder-password"
```

→ Semua test auth-dependent (Playwright E2E, k6-smoke) **skip gracefully**.  
→ `k6-load` sudah handle 404/5xx dengan aman.  
→ CI workflow **selalu hijau** — cocok untuk repo portfolio/library.

---

## Struktur

```
index.js                    # runner k6 (npm run test)
k6/
  api/auth/login.js         # login → Bearer access_token (pola asli performance/)
  api/core/collection/      # CRUD /api/collections
  api/core/user/            # /api/users
  test/core/{user,collection}/  # test case per resource (k6chaijs)
  test/index.js             # scenario runner (per-vu-iterations)
  smoke.js                  # smoke: Better Auth login → profile + collections (demo-safe)
  load/load_test.js         # load: SSE streaming template stream (X-API-Key, demo-safe)
tests/
  auth.auto.spec.ts         # Playwright: AUTO LOGIN → AUTO SIGNUP → save storageState
  e2e.authenticated.spec.ts # Playwright: dashboard, Quick Create, Auto Generate, AI Tools
playwright.config.ts        # project auth → chromium (pakai .auth/user.json)
.github/workflows/qa.yml    # CI: playwright-e2e, k6-smoke, k6-load
```

---

## Setup (Real Mode)

```bash
npm install
cp .env.example .env        # isi AUTH_*, BASE_URL, API_KEY, ERZA_*
npx playwright install chromium
```

---

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
k6 run k6/smoke.js           # smoke (Better Auth pada dev.erza.ai)
k6 run k6/load/load_test.js  # load streaming (butuh API_KEY)
```

---

## Catatan penting

- **Signup pakai allowlist** — API `sign-up/email` menolak email di luar domain yang di-approve (kode 422 "Email not allowed"). Auto-signup hanya berhasil untuk akun yang belum dibuat tapi domain-nya boleh.
- **Streaming di host terpisah** (`ai.dev.erza.ai`) memakai `X-API-Key`, bukan Bearer.
- Kredential tidak pernah di-commit (`.env`, `.auth/` ada di `.gitignore`).
- **Demo mode** dipicu otomatis jika `ERZA_EMAIL=test@example.com` **dan** `ERZA_PASSWORD=placeholder-password`.

---

## CI / GitHub Actions

Workflow `.github/workflows/qa.yml` menjalankan 3 job paralel:

| Job | Tujuan | Demo-safe? |
|-----|--------|------------|
| `playwright-e2e` | Auth → E2E dashboard + tools | ✅ skip jika placeholder |
| `k6-smoke` | Better Auth login → app API | ✅ skip jika placeholder |
| `k6-load` | SSE streaming (404 handled) | ✅ selalu safe |

k6 diinstal inline dari rilis resmi Grafana (`grafana/k6/releases`), **tidak pakai action `grafana/setup-k6` (404)**.

---

## Referensi asli

Struktur k6 (`api/core/*`, `test/core/*`) difork **1:1** dari folder `performance/` (original project k6: Httpx + k6chaijs, login → Bearer token, Collection/User CRUD).  
`k6/load/load_test.js` mempertahankan pola `load/` asli (SSE `X-API-Key`).  
Playwright auto-auth + CI wiring **baru** untuk repo ini.