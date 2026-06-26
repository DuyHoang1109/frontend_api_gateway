const DEFAULT_BASE_URL = import.meta.env.VITE_GATEWAY_BASE_URL || 'http://localhost:8080';
const STORAGE_KEY = 'gateway_admin_base_url';

export function getSavedBaseUrl() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_BASE_URL;
}

export function saveBaseUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  localStorage.setItem(STORAGE_KEY, normalized);
  return normalized;
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

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

export function createGatewayAdminApi(baseUrl) {
  return {
    health: async () => unwrap(await request(baseUrl, '/health')),
    ready: async () => unwrap(await request(baseUrl, '/ready')),

    listServices: async () => listFrom(await request(baseUrl, '/admin/services')),
    getService: async (id) => unwrap(await request(baseUrl, `/admin/services/${id}`)),
    createService: async (payload) => unwrap(await request(baseUrl, '/admin/services', { method: 'POST', ...jsonBody(payload) })),
    updateService: async (id, payload) => unwrap(await request(baseUrl, `/admin/services/${id}`, { method: 'PUT', ...jsonBody(payload) })),
    deleteService: async (id) => unwrap(await request(baseUrl, `/admin/services/${id}`, { method: 'DELETE' })),

    listServiceInstances: async (serviceId) => listFrom(await request(baseUrl, `/admin/services/${serviceId}/instances`)),
    listInstances: async () => listFrom(await request(baseUrl, '/admin/instances')),
    getInstance: async (id) => unwrap(await request(baseUrl, `/admin/instances/${id}`)),
    createInstance: async (serviceId, payload) => unwrap(await request(baseUrl, `/admin/services/${serviceId}/instances`, { method: 'POST', ...jsonBody(payload) })),
    updateInstance: async (id, payload) => unwrap(await request(baseUrl, `/admin/instances/${id}`, { method: 'PUT', ...jsonBody(payload) })),
    deleteInstance: async (id) => unwrap(await request(baseUrl, `/admin/instances/${id}`, { method: 'DELETE' })),

    listRoutes: async () => listFrom(await request(baseUrl, '/admin/routes')),
    getRoute: async (id) => unwrap(await request(baseUrl, `/admin/routes/${id}`)),
    createRoute: async (payload) => unwrap(await request(baseUrl, '/admin/routes', { method: 'POST', ...jsonBody(payload) })),
    updateRoute: async (id, payload) => unwrap(await request(baseUrl, `/admin/routes/${id}`, { method: 'PUT', ...jsonBody(payload) })),
    deleteRoute: async (id) => unwrap(await request(baseUrl, `/admin/routes/${id}`, { method: 'DELETE' }))
  };
}
