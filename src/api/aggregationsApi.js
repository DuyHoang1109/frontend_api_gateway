import { jsonBody, listFrom, unwrap } from './client.js';

export function createAggregationsApi(request) {
  return {
    listAggregations: async ({ page = 1, limit = 100 } = {}) => listFrom(await request(`/admin/aggregations?page=${page}&limit=${limit}`)),
    getAggregation: async (id) => unwrap(await request(`/admin/aggregations/${id}`)),
    createAggregation: async (payload) => unwrap(await request('/admin/aggregations', {
      method: 'POST',
      ...jsonBody(payload)
    })),
    updateAggregation: async (id, payload) => unwrap(await request(`/admin/aggregations/${id}`, {
      method: 'PUT',
      ...jsonBody(payload)
    })),
    deleteAggregation: async (id) => unwrap(await request(`/admin/aggregations/${id}`, { method: 'DELETE' })),
    listAggregationSteps: async (aggregationId) => unwrap(await request(`/admin/aggregations/${aggregationId}/steps`)),
    createAggregationStep: async (aggregationId, payload) => unwrap(await request(`/admin/aggregations/${aggregationId}/steps`, {
      method: 'POST',
      ...jsonBody(payload)
    })),
    updateAggregationStep: async (id, payload) => unwrap(await request(`/admin/aggregation-steps/${id}`, {
      method: 'PUT',
      ...jsonBody(payload)
    })),
    deleteAggregationStep: async (id) => unwrap(await request(`/admin/aggregation-steps/${id}`, { method: 'DELETE' }))
  };
}
