import { jsonBody, listFrom, unwrap } from './client.js';

export function createRoutesApi(request) {
  return {
    listRoutes: async ({ page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/routes?page=${page}&limit=${limit}`)),
    getRoute: async (id) => unwrap(await request(`/admin/routes/${id}`)),
    createRoute: async (payload) => unwrap(await request('/admin/routes', {
      method: 'POST',
      ...jsonBody(payload)
    })),
    updateRoute: async (id, payload) => unwrap(await request(`/admin/routes/${id}`, {
      method: 'PUT',
      ...jsonBody(payload)
    })),
    deleteRoute: async (id) => unwrap(await request(`/admin/routes/${id}`, { method: 'DELETE' }))
  };
}
