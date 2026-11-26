import { Httpx } from 'https://jslib.k6.io/httpx/0.1.0/index.js';

const session = new Httpx({
  baseURL: __ENV.BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

const DATA = {
  color: 'ffffff',
  description: 'QA test collection',
  name: 'QA Test Collection',
  icon: 'star'
};

export class Collection {
  constructor(token) {
    session.addHeader('Authorization', `Bearer ${token}`);
  }

  createCollection(payload = DATA) {
    return session.post('/api/collections', JSON.stringify(payload));
  }

  getCollection(page, limit, sortBy, sortdir, name) {
    const query = [];
    if (page) query.push(`page=${encodeURIComponent(page)}`);
    if (limit) query.push(`limit=${encodeURIComponent(limit)}`);
    if (sortBy) query.push(`sort_by=${encodeURIComponent(sortBy)}`);
    if (sortdir) query.push(`sort_dir=${encodeURIComponent(sortdir)}`);
    if (name) query.push(`name=${encodeURIComponent(name)}`);
    const qs = query.length ? `?${query.join('&')}` : '';
    return session.get(`/api/collections${qs}`);
  }

  getCollectionById(id) {
    return session.get(`/api/collections/${id}`);
  }

  updateCollection(id, request = DATA) {
    return session.patch(`/api/collections/${id}`, JSON.stringify(request));
  }

  deleteCollection(id) {
    return session.delete(`/api/collections/${id}`);
  }
}