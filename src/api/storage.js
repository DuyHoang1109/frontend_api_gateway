const DEFAULT_BASE_URL = import.meta.env.VITE_GATEWAY_BASE_URL || 'http://localhost:8080';
const BASE_URL_KEY = 'gateway_admin_base_url';
const ACCESS_TOKEN_KEY = 'gateway_admin_access_token';
const REFRESH_TOKEN_KEY = 'gateway_admin_refresh_token';

export function normalizeBaseUrl(baseUrl) {
  return (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export function getSavedBaseUrl() {
  return localStorage.getItem(BASE_URL_KEY) || DEFAULT_BASE_URL;
}

export function saveBaseUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  localStorage.setItem(BASE_URL_KEY, normalized);
  return normalized;
}

export function getSavedAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

export function saveAccessToken(accessToken) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  return accessToken;
}

export function getSavedRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
}

export function saveRefreshToken(refreshToken) {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  return refreshToken;
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function clearRefreshToken() {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAuthTokens() {
  clearAccessToken();
  clearRefreshToken();
}
