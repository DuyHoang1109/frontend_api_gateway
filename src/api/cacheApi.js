import { unwrap } from './client.js';

export function createCacheApi(request) {
  return {
    getCacheVersion: async () => unwrap(await request('/admin/cache/version')),
    reloadCache: async () => unwrap(await request('/admin/cache/reload', { method: 'POST' }))
  };
}
