import { Httpx } from 'https://jslib.k6.io/httpx/0.1.0/index.js';

const session = new Httpx({
  baseURL: __ENV.AUTH_BASE_URL || __ENV.BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

const EMAIL = __ENV.AUTH_EMAIL || __ENV.EMAIL;
const PASSWORD = __ENV.AUTH_PASSWORD || __ENV.PASSWORD;

export default function login() {
  let authToken = null;

  const resp = session.post('/api/auth/login', JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
    remember_me: false
  }));

  if (resp.status !== 200) {
    throw new Error(`Login failed: ${resp.status} ${resp.body}`);
  }

  try {
    const body = resp.json();
    authToken = body?.result?.access_token || body?.access_token || body?.token;
  } catch (e) {
    throw new Error(`Login response invalid JSON: ${resp.body}`);
  }

  if (!authToken || typeof authToken !== 'string') {
    throw new Error(`No access_token in login response: ${resp.body}`);
  }

  return authToken;
}