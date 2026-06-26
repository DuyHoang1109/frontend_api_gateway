export const defaultServiceForm = {
  name: '',
  description: '',
  protocol: 'http',
  lb_strategy: 'round_robin',
  timeout_ms: 5000,
  retry_count: 1,
  circuit_breaker_enabled: false,
  is_active: true
};

export const defaultInstanceForm = {
  service_id: '',
  host: 'localhost',
  port: 3001,
  weight: 1,
  is_active: true
};

export const defaultRouteForm = {
  path: '',
  method: 'GET',
  service_id: '',
  strip_prefix: false,
  rewrite_target: '',
  auth_required: false,
  rate_limit_id: '',
  priority: 10,
  is_active: true
};

function toNullable(value) {
  if (value === '') return null;
  return value;
}

export function servicePayload(form) {
  return {
    name: form.name,
    description: toNullable(form.description),
    protocol: form.protocol,
    lb_strategy: form.lb_strategy,
    timeout_ms: Number(form.timeout_ms),
    retry_count: Number(form.retry_count),
    circuit_breaker_enabled: Boolean(form.circuit_breaker_enabled),
    is_active: Boolean(form.is_active)
  };
}

export function instancePayload(form) {
  return {
    host: form.host,
    port: Number(form.port),
    weight: Number(form.weight),
    is_active: Boolean(form.is_active),
    ...(form.service_id ? { service_id: form.service_id } : {})
  };
}

export function routePayload(form) {
  return {
    path: form.path,
    method: form.method,
    service_id: form.service_id,
    strip_prefix: Boolean(form.strip_prefix),
    rewrite_target: toNullable(form.rewrite_target),
    auth_required: Boolean(form.auth_required),
    rate_limit_id: toNullable(form.rate_limit_id),
    priority: Number(form.priority),
    is_active: Boolean(form.is_active)
  };
}
