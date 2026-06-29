import { jsonBody, listFrom, unwrap } from './client.js';

export function createServicesApi(request) {
  return {
    listServices: async () => listFrom(await request('/admin/services')),
    getService: async (id) => unwrap(await request(`/admin/services/${id}`)),
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
