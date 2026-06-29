import { jsonBody, unwrap } from './client.js';

export function createAuthApi(request) {
  return {
    login: async (payload) => unwrap(await request('/auth/login', {
      method: 'POST',
      authenticated: false,
      ...jsonBody(payload)
    })),
    refresh: async (refreshToken) => unwrap(await request('/auth/refresh', {
      method: 'POST',
      authenticated: false,
      ...jsonBody({ refresh_token: refreshToken })
    })),
    me: async () => unwrap(await request('/auth/me')),
    logout: async (refreshToken) => unwrap(await request('/auth/logout', {
      method: 'POST',
      ...jsonBody({ refresh_token: refreshToken }),
      onUnauthorizedRetry: (tokens) => ({
        method: 'POST',
        ...jsonBody({ refresh_token: tokens.refresh_token })
      })
    }))
  };
}
