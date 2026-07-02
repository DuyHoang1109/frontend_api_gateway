import { jsonBody, listFrom, unwrap } from './client.js';

export function createAPIKeysApi(request) {
  return {
    listAPIKeys: async ({ page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/api-keys?page=${page}&limit=${limit}`)),
    getAPIKey: async (id) => unwrap(await request(`/admin/api-keys/${id}`)),
    createAPIKey: async (payload) => unwrap(await request('/admin/api-keys', {
      method: 'POST',
      ...jsonBody(payload)
    })),
    updateAPIKey: async (id, payload) => unwrap(await request(`/admin/api-keys/${id}`, {
      method: 'PUT',
      ...jsonBody(payload)
    })),
    revokeAPIKey: async (id) => unwrap(await request(`/admin/api-keys/${id}/revoke`, { method: 'POST' })),
    rotateAPIKey: async (id) => unwrap(await request(`/admin/api-keys/${id}/rotate`, { method: 'POST' }))
  };
}
