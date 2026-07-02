import { jsonBody, listFrom, unwrap } from './client.js';

export function createInstancesApi(request) {
  return {
    listServiceInstances: async (serviceId, { page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/services/${serviceId}/instances?page=${page}&limit=${limit}`)),
    listInstances: async ({ page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/instances?page=${page}&limit=${limit}`)),
    getInstance: async (id) => unwrap(await request(`/admin/instances/${id}`)),
    getInstanceHealth: async (id) => unwrap(await request(`/admin/instances/${id}/health`)),
    checkInstanceHealth: async (id) => unwrap(await request(`/admin/instances/${id}/health-check`, { method: 'POST' })),
    createInstance: async (serviceId, payload) => unwrap(await request(`/admin/services/${serviceId}/instances`, {
      method: 'POST',
      ...jsonBody(payload)
    })),
    updateInstance: async (id, payload) => unwrap(await request(`/admin/instances/${id}`, {
      method: 'PUT',
      ...jsonBody(payload)
    })),
    deleteInstance: async (id) => unwrap(await request(`/admin/instances/${id}`, { method: 'DELETE' }))
  };
}
