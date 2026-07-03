import { jsonBody, unwrap } from './client.js';

export function createCORSApi(request) {
  return {
    getRouteCORS: async (routeId) => unwrap(await request(`/admin/routes/${routeId}/cors`)),
    upsertRouteCORS: async (routeId, payload) => unwrap(await request(`/admin/routes/${routeId}/cors`, {
      method: 'PUT',
      ...jsonBody(payload)
    })),
    deleteRouteCORS: async (routeId) => request(`/admin/routes/${routeId}/cors`, { method: 'DELETE' })
  };
}
