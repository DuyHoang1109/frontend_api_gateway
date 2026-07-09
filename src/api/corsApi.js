import { jsonBody, listFrom, unwrap } from './client.js';

export function createCORSApi(request) {
  return {
    listCORSPolicies: async ({ page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/cors-policies?page=${page}&limit=${limit}`)),
    getCORSPolicy: async (id) => unwrap(await request(`/admin/cors-policies/${id}`)),
    createCORSPolicy: async (payload) => unwrap(await request('/admin/cors-policies', {
      method: 'POST',
      ...jsonBody(payload)
    })),
    updateCORSPolicy: async (id, payload) => unwrap(await request(`/admin/cors-policies/${id}`, {
      method: 'PUT',
      ...jsonBody(payload)
    })),
    deleteCORSPolicy: async (id) => unwrap(await request(`/admin/cors-policies/${id}`, { method: 'DELETE' }))
  };
}
