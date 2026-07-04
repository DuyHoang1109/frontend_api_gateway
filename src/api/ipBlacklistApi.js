import { jsonBody, listFrom, unwrap } from './client.js';

export function createIPBlacklistApi(request) {
  return {
    listIPBlacklist: async ({ page = 1, limit = 100, includeDeleted = false } = {}) => {
      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (includeDeleted) query.set('include_deleted', 'true');
      return listFrom(await request(`/admin/ip-blacklist?${query.toString()}`));
    },
    getIPBlacklistEntry: async (id) => unwrap(await request(`/admin/ip-blacklist/${id}`)),
    createIPBlacklistEntry: async (payload) => unwrap(await request('/admin/ip-blacklist', {
      method: 'POST',
      ...jsonBody(payload)
    })),
    updateIPBlacklistEntry: async (id, payload) => unwrap(await request(`/admin/ip-blacklist/${id}`, {
      method: 'PUT',
      ...jsonBody(payload)
    })),
    deleteIPBlacklistEntry: async (id) => unwrap(await request(`/admin/ip-blacklist/${id}`, { method: 'DELETE' }))
  };
}
