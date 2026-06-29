import { jsonBody, listFrom, unwrap } from './client.js';

export function createInstancesApi(request) {
  return {
    listServiceInstances: async (serviceId) => listFrom(await request(`/admin/services/${serviceId}/instances`)),
    listInstances: async () => listFrom(await request('/admin/instances')),
    getInstance: async (id) => unwrap(await request(`/admin/instances/${id}`)),
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
