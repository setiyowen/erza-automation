import login from '../../../api/auth/login.js';

export function setup() {
  const token = login();
  return { token };
}