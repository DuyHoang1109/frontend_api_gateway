import { jsonBody, listFrom, unwrap } from './client.js';

export function createRoutesApi(request) {
  return {
    listRoutes: async () => listFrom(await request('/admin/routes')),
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
