import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.3/index.js';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { Collection as CollectionAPI } from '../../../api/core/collection/index.js';

export { setup } from '../../setup.js';

export default function Collection({ token }) {
  const collection = new CollectionAPI(token);

  describe('Collection data - create', () => {
    describe('create collection with data', () => {
      const payload = {
        color: 'ffffff',
        description: randomString(5),
        name: randomString(5),
        icon: randomString(5)
      };
      const response = collection.createCollection(payload);

      expect(response.status, 'Create collection status').to.equal(201);
      expect(response, 'Create collection response').to.have.validJsonBody();
    });
    describe('Missing mandatory field', () => {
      const payload = { description: randomString(5) };
      const response = collection.createCollection(payload);

      expect(response.status, 'Create collection missing field status').to.equal(422);
    });
  });

  describe('Collection data - get all', () => {
    describe('Get all without parameter', () => {
      const response = collection.getCollection();
      expect(response.status, 'Get collection status').to.equal(200);
      expect(response, 'Get collection valid json response').to.have.validJsonBody();
    });

    describe('Get all with limit parameter', () => {
      const response = collection.getCollection(undefined, 1);
      expect(response.status, 'Get collection with limit status').to.equal(200);
      expect(response, 'Get collection with limit valid json').to.have.validJsonBody();
    });
  });
}