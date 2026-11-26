import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.3/index.js';
import { User as UserAPI } from '../../../api/core/user/index.js';

export { setup } from '../../setup.js';

export default function User({ token }) {
  const user = new UserAPI(token);

  describe('User - Get Profile', () => {
    describe('Get Success', () => {
      const resp = user.getUserProfile();
      expect(resp.status, 'Get User status').to.equal(200);
      expect(resp, 'Get User valid json response').to.have.validJsonBody();
    });
  });
}