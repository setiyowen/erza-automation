import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.3/index.js';
import { Httpx } from 'https://jslib.k6.io/httpx/0.1.0/index.js';

const BASE = __ENV.BASE_URL || 'https://api.dev.erza.ai/';

const session = new Httpx({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' }
});

const EMAIL = __ENV.AUTH_EMAIL;
const PASSWORD = __ENV.AUTH_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error('Set AUTH_EMAIL and AUTH_PASSWORD for smoke test');
}

export function setup() {
  const resp = session.post('/api/auth/login', JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
    remember_me: false
  }));
  if (resp.status !== 200) throw new Error(`Login failed: ${resp.status} ${resp.body}`);
  const body = resp.json();
  const token = body?.result?.access_token || body?.access_token || body?.token;
  if (!token) throw new Error(`No token: ${resp.body}`);
  return { token };
}

export default function ({ token }) {
  session.addHeader('Authorization', `Bearer ${token}`);

  describe('Smoke: Login → Get Profile', () => {
    describe('Get User', () => {
      const resp = session.get('/api/users');
      expect(resp.status, 'Get User').to.equal(200);
      expect(resp, 'Valid JSON').to.have.validJsonBody();
    });

    describe('Get Collections', () => {
      const resp = session.get('/api/collections?limit=5');
      expect(resp.status, 'Get Collections').to.equal(200);
      expect(resp, 'Valid JSON').to.have.validJsonBody();
    });
  });
}