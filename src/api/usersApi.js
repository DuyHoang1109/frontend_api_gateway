import { jsonBody, listFrom, unwrap } from './client.js';

export function createUsersApi(request) {
  return {
    listUsers: async ({ page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/users?page=${page}&limit=${limit}`)),
    getUser: async (id) => unwrap(await request(`/admin/users/${id}`)),
    updateUser: async (id, payload) => unwrap(await request(`/admin/users/${id}`, { method: 'PUT', ...jsonBody(payload) })),
    deleteUser: async (id) => request(`/admin/users/${id}`, { method: 'DELETE' })
  };
}
