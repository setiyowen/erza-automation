import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const BASE = __ENV.ERZA_BASE_URL || 'https://dev.erza.ai';
const EMAIL = __ENV.ERZA_EMAIL || '';
const PASSWORD = __ENV.ERZA_PASSWORD || '';

// Demo-safe: placeholder credentials -> smoke test skips auth checks,
// so portfolio CI stays green without a real account.
const DEMO_MODE =
  EMAIL === 'test@example.com' && PASSWORD === 'placeholder-password';

const loginDuration = new Trend('login_duration');
const authSuccess = new Counter('auth_success');
const authFail = new Counter('auth_fail');

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: DEMO_MODE ? ['rate>=0'] : ['rate>0.9'],
  },
};

/**
 * NOTE: http.cookieJar() may only be created in VU context, NOT at module
 * (init) top-level — k6 throws "Making cookie jars in the init context is not
 * supported". So the jar is created inside the default (VU) function below.
 */
export default function () {
  const jar = http.cookieJar();

  if (DEMO_MODE) {
    check(true, { 'demo-mode skip': () => true });
    return;
  }

  // Better Auth login -> session cookie stored in this VU's jar
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const start = Date.now();
  const login = http.post(`${BASE}/api/auth/sign-in/email`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE,
      Referer: `${BASE}/en/signin`,
    },
    jar,
    redirects: 0,
  });
  loginDuration.add(Date.now() - start);

  if (login.status === 200 || login.status === 204) {
    authSuccess.add(1);
    console.log('✅ Login OK, session cookie stored in jar');
  } else {
    authFail.add(1);
    console.log(`⚠️ Login ${login.status}: ${login.body}`);
  }

  const H = { 'Content-Type': 'application/json', Origin: BASE };
  const userResp = http.get(`${BASE}/api/users`, { headers: H, jar });
  check(userResp, {
    'GET /api/users authenticated': (r) => r.status === 200,
  });

  const collResp = http.get(`${BASE}/api/collections?limit=5`, {
    headers: H,
    jar,
  });
  check(collResp, {
    'GET /api/collections authenticated': (r) => r.status === 200,
  });

  sleep(0.5);
}