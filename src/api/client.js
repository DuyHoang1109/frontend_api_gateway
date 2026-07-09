import {
  clearAuthTokens,
  getSavedAccessToken,
  getSavedRefreshToken,
  normalizeBaseUrl,
  saveAccessToken,
  saveRefreshToken
} from './storage.js';

const refreshRequests = new Map();

export function unwrap(body) {
  if (body && Object.prototype.hasOwnProperty.call(body, 'success') && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data;
  }

  return body;
}

export function listFrom(body) {
  const data = unwrap(body);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

export function jsonBody(payload) {
  return { body: JSON.stringify(payload) };
}

function createHttpError(response, body) {
  const message = body?.error?.message || body?.message || `${response.status} ${response.statusText}`;
  const error = new Error(message);
  error.status = response.status;
  error.body = body;
  return error;
}

async function readResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

async function requestNewTokens(baseUrl) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const runningRequest = refreshRequests.get(normalizedBaseUrl);
  if (runningRequest) return runningRequest;

  let attemptedRefreshToken = '';
  const refreshRequest = (async () => {
    const refreshToken = getSavedRefreshToken();
    attemptedRefreshToken = refreshToken;
    if (!refreshToken) {
      throw new Error('Session expired');
    }

    const response = await fetch(`${normalizedBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const body = await readResponse(response);
    if (!response.ok) throw createHttpError(response, body);

    const tokens = unwrap(body);
    if (!tokens?.access_token || !tokens?.refresh_token) {
      throw new Error('Invalid refresh response');
    }

    saveAccessToken(tokens.access_token);
    saveRefreshToken(tokens.refresh_token);
    return tokens;
  })().catch((error) => {
    const latestAccessToken = getSavedAccessToken();
    const latestRefreshToken = getSavedRefreshToken();
    if (latestAccessToken && latestRefreshToken && latestRefreshToken !== attemptedRefreshToken) {
      return {
        access_token: latestAccessToken,
        refresh_token: latestRefreshToken
      };
    }
    throw error;
  });

  refreshRequests.set(normalizedBaseUrl, refreshRequest);
  try {
    return await refreshRequest;
  } finally {
    refreshRequests.delete(normalizedBaseUrl);
  }
}

export function createApiClient(baseUrl, accessToken = '', callbacks = {}) {
  return async function request(path, options = {}) {
    const {
      authenticated = true,
      retryOnUnauthorized = true,
      onUnauthorizedRetry,
      headers,
      ...fetchOptions
    } = options;
    const currentAccessToken = getSavedAccessToken() || accessToken;
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(authenticated && currentAccessToken ? { Authorization: `Bearer ${currentAccessToken}` } : {}),
        ...(headers || {})
      }
    });

    if (response.status === 401 && authenticated && retryOnUnauthorized) {
      try {
        const tokens = await requestNewTokens(baseUrl);
        callbacks.onTokensRefreshed?.(tokens);
        const retryOptions = onUnauthorizedRetry
          ? onUnauthorizedRetry(tokens)
          : options;
        return request(path, { ...retryOptions, retryOnUnauthorized: false });
      } catch (error) {
        if (error.status === 401) {
          clearAuthTokens();
          callbacks.onAuthFailure?.(error);
        }
        throw error;
      }
    }

    const body = await readResponse(response);
    if (!response.ok) throw createHttpError(response, body);

    return body;
  };
}
