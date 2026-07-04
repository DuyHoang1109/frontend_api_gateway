import { jsonBody, listFrom, unwrap } from './client.js';

export function createRateLimitsApi(request) {
  return {
    listRateLimitPolicies: async ({ page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/rate-limit-policies?page=${page}&limit=${limit}`)),
    getRateLimitPolicy: async (id) => unwrap(await request(`/admin/rate-limit-policies/${id}`)),
    createRateLimitPolicy: async (payload) => unwrap(await request('/admin/rate-limit-policies', {
      method: 'POST',
      ...jsonBody(payload)
    })),
    updateRateLimitPolicy: async (id, payload) => unwrap(await request(`/admin/rate-limit-policies/${id}`, {
      method: 'PUT',
      ...jsonBody(payload)
    })),
    deleteRateLimitPolicy: async (id) => request(`/admin/rate-limit-policies/${id}`, { method: 'DELETE' })
  };
}
