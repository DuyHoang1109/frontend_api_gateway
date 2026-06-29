import { createApiClient } from './client.js';
import { createAuthApi } from './authApi.js';
import { createHealthApi } from './healthApi.js';
import { createInstancesApi } from './instancesApi.js';
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
    ...createServicesApi(request),
    ...createInstancesApi(request),
    ...createRoutesApi(request)
  };
}
