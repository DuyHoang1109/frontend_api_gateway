import { listFrom, unwrap } from './client.js';

export function createAuthorizationApi(request) {
  return {
    listRoles: async ({ page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/roles?page=${page}&limit=${limit}`)),
    getRole: async (id) => unwrap(await request(`/admin/roles/${id}`)),
    getRolePermissions: async (id) => unwrap(await request(`/admin/roles/${id}/permissions`)),
    listPermissions: async ({ page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/permissions?page=${page}&limit=${limit}`)),
    getPermission: async (id) => unwrap(await request(`/admin/permissions/${id}`))
  };
}
