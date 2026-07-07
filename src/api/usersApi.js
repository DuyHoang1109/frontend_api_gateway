import { listFrom, unwrap } from './client.js';

export function createUsersApi(request) {
  return {
    listUsers: async ({ page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/users?page=${page}&limit=${limit}`)),
    getUser: async (id) => unwrap(await request(`/admin/users/${id}`))
  };
}
