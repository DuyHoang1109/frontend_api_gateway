const DEFAULT_BASE_URL = import.meta.env.VITE_GATEWAY_BASE_URL || 'http://localhost:8080';
const STORAGE_KEY = 'gateway_admin_base_url';
const AUTH_TOKEN_KEY = 'gateway_admin_access_token';

export function getSavedBaseUrl() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_BASE_URL;
}

export function saveBaseUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  localStorage.setItem(STORAGE_KEY, normalized);
  return normalized;
}

export function getSavedAccessToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function saveAccessToken(accessToken) {
  localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  return accessToken;
}

export function clearAccessToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function unwrap(body) {
  if (body && Object.prototype.hasOwnProperty.call(body, 'success') && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data;
  }

  return body;
}

function listFrom(body) {
  const data = unwrap(body);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

async function request(baseUrl, path, options = {}, accessToken = '') {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      `${response.status} ${response.statusText}`;

    throw new Error(message);
  }

  return body;
}

const jsonBody = (payload) => ({ body: JSON.stringify(payload) });

export function createGatewayAdminApi(baseUrl, accessToken = '') {
  return {
    health: async () => unwrap(await request(baseUrl, '/health', {}, accessToken)),
    ready: async () => unwrap(await request(baseUrl, '/ready', {}, accessToken)),

    login: async (payload) => unwrap(await request(baseUrl, '/auth/login', { method: 'POST', ...jsonBody(payload) })),
    me: async () => unwrap(await request(baseUrl, '/auth/me', {}, accessToken)),

    listServices: async () => listFrom(await request(baseUrl, '/admin/services', {}, accessToken)),
    getService: async (id) => unwrap(await request(baseUrl, `/admin/services/${id}`, {}, accessToken)),
    createService: async (payload) => unwrap(await request(baseUrl, '/admin/services', { method: 'POST', ...jsonBody(payload) }, accessToken)),
    updateService: async (id, payload) => unwrap(await request(baseUrl, `/admin/services/${id}`, { method: 'PUT', ...jsonBody(payload) }, accessToken)),
    deleteService: async (id) => unwrap(await request(baseUrl, `/admin/services/${id}`, { method: 'DELETE' }, accessToken)),

    listServiceInstances: async (serviceId) => listFrom(await request(baseUrl, `/admin/services/${serviceId}/instances`, {}, accessToken)),
    listInstances: async () => listFrom(await request(baseUrl, '/admin/instances', {}, accessToken)),
    getInstance: async (id) => unwrap(await request(baseUrl, `/admin/instances/${id}`, {}, accessToken)),
    createInstance: async (serviceId, payload) => unwrap(await request(baseUrl, `/admin/services/${serviceId}/instances`, { method: 'POST', ...jsonBody(payload) }, accessToken)),
    updateInstance: async (id, payload) => unwrap(await request(baseUrl, `/admin/instances/${id}`, { method: 'PUT', ...jsonBody(payload) }, accessToken)),
    deleteInstance: async (id) => unwrap(await request(baseUrl, `/admin/instances/${id}`, { method: 'DELETE' }, accessToken)),

    listRoutes: async () => listFrom(await request(baseUrl, '/admin/routes', {}, accessToken)),
    getRoute: async (id) => unwrap(await request(baseUrl, `/admin/routes/${id}`, {}, accessToken)),
    createRoute: async (payload) => unwrap(await request(baseUrl, '/admin/routes', { method: 'POST', ...jsonBody(payload) }, accessToken)),
    updateRoute: async (id, payload) => unwrap(await request(baseUrl, `/admin/routes/${id}`, { method: 'PUT', ...jsonBody(payload) }, accessToken)),
    deleteRoute: async (id) => unwrap(await request(baseUrl, `/admin/routes/${id}`, { method: 'DELETE' }, accessToken))
  };
}
