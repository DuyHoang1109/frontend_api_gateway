import { jsonBody, listFrom, unwrap } from './client.js';

export function createClientsApi(request) {
  return {
    listClients: async ({ page = 1, limit = 100, search = '' } = {}) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search.trim()) params.set('search', search.trim());
      return listFrom(await request(`/admin/clients?${params.toString()}`));
    },
    getClient: async (id) => unwrap(await request(`/admin/clients/${id}`)),
    createClient: async (payload) => unwrap(await request('/admin/clients', {
      method: 'POST',
      ...jsonBody(payload)
    })),
    updateClient: async (id, payload) => unwrap(await request(`/admin/clients/${id}`, {
      method: 'PUT',
      ...jsonBody(payload)
    })),
    deleteClient: async (id) => request(`/admin/clients/${id}`, { method: 'DELETE' })
  };
}
