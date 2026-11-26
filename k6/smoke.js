import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const BASE = __ENV.ERZA_BASE_URL || 'https://dev.erza.ai';
const EMAIL = __ENV.ERZA_EMAIL;
const PASSWORD = __ENV.ERZA_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error('Set ERZA_EMAIL and ERZA_PASSWORD for smoke test');
}

// One module-level cookie jar, shared between setup() and the VUs.
// (A fresh http.cookieJar() per call would discard the login session.)
const jar = http.cookieJar();

const loginDuration = new Trend('login_duration');
const authSuccess = new Counter('auth_success');
const authFail = new Counter('auth_fail');

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    login_duration: ['p(95)<10000'],
  },
};

function doLogin() {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE,
      Referer: `${BASE}/en/signin`,
    },
    jar,
    redirects: 0,
  };
  const start = Date.now();
  const resp = http.post(`${BASE}/api/auth/sign-in/email`, payload, params);
  loginDuration.add(Date.now() - start);

  if (resp.status === 200 || resp.status === 204) {
    authSuccess.add(1);
    return true;
  }
  authFail.add(1);
  console.log(`Login failed: ${resp.status} ${resp.body}`);
  return false;
}

export function setup() {
  if (!doLogin()) throw new Error('Authentication failed in setup');
  console.log('✅ Login OK, session cookie stored in shared jar');
}

export default function () {
  const H = { 'Content-Type': 'application/json', Origin: BASE };

  const userResp = http.get(`${BASE}/api/users`, { headers: H, jar });
  check(userResp, {
    'GET /api/users authenticated': (r) => r.status === 200,
  });

  const collResp = http.get(`${BASE}/api/collections?limit=5`, { headers: H, jar });
  check(collResp, {
    'GET /api/collections authenticated': (r) => r.status === 200,
  });

  sleep(0.5);
}