import { createApiClient } from './client.js';
import { createAuthApi } from './authApi.js';
import { createAPIKeysApi } from './apiKeysApi.js';
import { createAuthorizationApi } from './authorizationApi.js';
import { createCacheApi } from './cacheApi.js';
import { createCORSApi } from './corsApi.js';
import { createHealthApi } from './healthApi.js';
import { createIPBlacklistApi } from './ipBlacklistApi.js';
import { createInstancesApi } from './instancesApi.js';
import { createRateLimitsApi } from './rateLimitsApi.js';
import { createRoutesApi } from './routesApi.js';
import { createServicesApi } from './servicesApi.js';

export {
  clearAccessToken,
  clearAuthTokens,
  clearRefreshToken,
  getSavedAccessToken,
  getSavedBaseUrl,
  getSavedRefreshToken,
  saveAccessToken,
  saveBaseUrl,
  saveRefreshToken
} from './storage.js';

export function createGatewayAdminApi(baseUrl, accessToken = '', callbacks = {}) {
  const request = createApiClient(baseUrl, accessToken, callbacks);

  return {
    ...createHealthApi(request),
    ...createAuthApi(request),
    ...createAPIKeysApi(request),
    ...createAuthorizationApi(request),
    ...createIPBlacklistApi(request),
    ...createRateLimitsApi(request),
    ...createCacheApi(request),
    ...createCORSApi(request),
    ...createServicesApi(request),
    ...createInstancesApi(request),
    ...createRoutesApi(request)
  };
}
