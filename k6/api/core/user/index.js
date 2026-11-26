import { Httpx } from 'https://jslib.k6.io/httpx/0.1.0/index.js';

const session = new Httpx({
  baseURL: __ENV.BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

export class User {
  constructor(token) {
    session.addHeader('Authorization', `Bearer ${token}`);
  }

  getUserProfile() {
    return session.get('/api/users');
  }
}