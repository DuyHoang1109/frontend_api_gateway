import { unwrap } from './client.js';

export function createHealthApi(request) {
  return {
    health: async () => unwrap(await request('/health')),
    ready: async () => unwrap(await request('/ready'))
  };
}
