import { jsonBody, listFrom, unwrap } from './client.js';

export function createServicesApi(request) {
  return {
    listServices: async ({ page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/services?page=${page}&limit=${limit}`)),
    getService: async (id) => unwrap(await request(`/admin/services/${id}`)),
    getServiceHealth: async (id) => unwrap(await request(`/admin/services/${id}/health`)),
    createService: async (payload) => unwrap(await request('/admin/services', {
      method: 'POST',
      ...jsonBody(payload)
    })),
    updateService: async (id, payload) => unwrap(await request(`/admin/services/${id}`, {
      method: 'PUT',
      ...jsonBody(payload)
    })),
    deleteService: async (id) => unwrap(await request(`/admin/services/${id}`, { method: 'DELETE' }))
  };
}
