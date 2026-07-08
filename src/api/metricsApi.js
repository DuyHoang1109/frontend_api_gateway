import { getSavedAccessToken, normalizeBaseUrl } from './storage.js';
import { listFrom, unwrap } from './client.js';

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function createMetricsApi(request, getLogBaseUrl, accessToken = '') {
  return {
    getLogs: async (params = {}) => listFrom(await request(`/admin/logs${queryString(params)}`)),
    getMetricsSummary: async (params = {}) => unwrap(await request(`/admin/metrics/summary${queryString(params)}`)),
    getRps: async (params = {}) => unwrap(await request(`/admin/metrics/rps${queryString(params)}`)),
    getErrorRate: async (params = {}) => unwrap(await request(`/admin/metrics/error-rate${queryString(params)}`)),
    getLatency: async (params = {}) => unwrap(await request(`/admin/metrics/latency${queryString(params)}`)),
    getStatusCodes: async (params = {}) => unwrap(await request(`/admin/metrics/status-codes${queryString(params)}`)),
    getTopRoutes: async (params = {}) => unwrap(await request(`/admin/metrics/top-routes${queryString(params)}`)),
    getRealtimeSnapshot: (params = {}) => getRealtimeSnapshot(request, params),
    streamRealtimeMetrics: (params = {}, handlers = {}) => streamRealtimeMetrics(getLogBaseUrl(), accessToken, params, handlers)
  };
}

async function getRealtimeSnapshot(request, params = {}) {
  const windowValue = params.window || '60s';
  const interval = params.interval || '1s';
  const metricParams = {
    ...params,
    from: `now-${windowValue}`,
    to: 'now',
    interval
  };
  delete metricParams.window;
  delete metricParams.top_limit;

  const [summary, rps, errorRate, statusCodes, topRoutes] = await Promise.all([
    request(`/admin/metrics/summary${queryString(metricParams)}`).then(unwrap),
    request(`/admin/metrics/rps${queryString(metricParams)}`).then(unwrap),
    request(`/admin/metrics/error-rate${queryString(metricParams)}`).then(unwrap),
    request(`/admin/metrics/status-codes${queryString(metricParams)}`).then(unwrap),
    request(`/admin/metrics/top-routes${queryString({ ...metricParams, limit: params.top_limit || 10 })}`).then(unwrap)
  ]);

  return {
    window: windowValue,
    interval,
    generated_at: new Date().toISOString(),
    filters: summary?.filters || {},
    summary: summary?.data || {},
    rps: Array.isArray(rps?.data) ? rps.data : [],
    error_rate_series: Array.isArray(errorRate?.data?.series) ? errorRate.data.series : [],
    status_codes: statusCodes?.data || { by_class: [], by_code: [] },
    top_routes: Array.isArray(topRoutes?.data) ? topRoutes.data : []
  };
}

async function streamRealtimeMetrics(baseUrl, accessToken, params, handlers) {
  const token = getSavedAccessToken() || accessToken;
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${'/admin/metrics/realtime/stream'}${queryString(params)}`, {
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    signal: handlers.signal
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('Realtime stream is not supported by this browser');
  }

  handlers.onOpen?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split(/\n\n/);
    buffer = events.pop() || '';
    events.forEach((rawEvent) => dispatchSSEEvent(rawEvent, handlers));
  }
}

function dispatchSSEEvent(rawEvent, handlers) {
  const lines = rawEvent.split(/\r?\n/);
  let event = 'message';
  let data = '';

  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    }
    if (line.startsWith('data:')) {
      data += line.slice(5).trim();
    }
  });

  if (!data) return;

  let payload = data;
  try {
    payload = JSON.parse(data);
  } catch {
    // Keep raw payload for non-JSON events.
  }

  if (event === 'metrics') handlers.onMetrics?.(payload);
  else if (event === 'error') handlers.onError?.(payload);
  else if (event === 'ping') handlers.onPing?.();
}
