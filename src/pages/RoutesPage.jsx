import React, { useState } from 'react';
import { Alert, EmptyState, Field, FormActions, Pagination, Panel, RowActions, SelectField, StatusPill, Toggle } from '../components/common.jsx';

export default function RoutesPage(props) {
  const {
    api,
    services,
    routes,
    form,
    setForm,
    editing,
    onSubmit,
    onCancel,
    onEdit,
    onDelete,
    onInspect,
    serviceName,
    canWrite = false,
    canReadRateLimits = false,
    canReadApiKeys = false,
    canReadCorsPolicies = false,
    page,
    pageSize,
    totalItems,
    onPageChange
  } = props;
  const [rateLimitPolicies, setRateLimitPolicies] = useState([]);
  const [apiScopes, setApiScopes] = useState([]);
  const [corsPolicies, setCorsPolicies] = useState([]);
  const [loadWarning, setLoadWarning] = useState('');

  React.useEffect(() => {
    let active = true;
    Promise.allSettled([
      canReadRateLimits ? api.listRateLimitPolicies() : Promise.resolve([]),
      canReadApiKeys ? api.getAPIKeyOptions() : Promise.resolve({ api_scopes: [] }),
      canReadCorsPolicies ? api.listCORSPolicies() : Promise.resolve([])
    ])
      .then(([rateLimitsResult, apiKeyOptionsResult, corsPoliciesResult]) => {
        if (!active) return;
        setRateLimitPolicies(rateLimitsResult.status === 'fulfilled' ? onlyIPPolicies(rateLimitsResult.value) : []);
        setApiScopes(apiKeyOptionsResult.status === 'fulfilled' ? (apiKeyOptionsResult.value.api_scopes || []) : []);
        setCorsPolicies(corsPoliciesResult.status === 'fulfilled' ? corsPoliciesResult.value : []);
        const failed = [rateLimitsResult, apiKeyOptionsResult, corsPoliciesResult].find((item) => item.status === 'rejected');
        setLoadWarning(failed ? 'Some route options could not be loaded' : '');
      });
    return () => { active = false; };
  }, [api, canReadApiKeys, canReadCorsPolicies, canReadRateLimits]);

  const routeScopeOptions = apiScopes
    .filter((scope) => !form.service_id || scope.service_id === undefined || scope.service_id === form.service_id)
    .map((scope) => ({ value: scope.id, label: scopeLabel(scope) }));

  return (
    <section className="content-stack">
      {loadWarning && <Alert type="error" message={loadWarning} onClose={() => setLoadWarning('')} />}

      {canWrite && (
        <Panel title={editing ? 'Update route' : 'Create route'} eyebrow={editing ? 'PUT /admin/routes/:id' : 'POST /admin/routes'}>
          <form className="form-grid" onSubmit={onSubmit}>
            <Field label="Path" value={form.path} onChange={(value) => setForm({ ...form, path: value })} placeholder="/api/products" required />
            <SelectField label="Method" value={form.method} onChange={(value) => setForm({ ...form, method: value })} options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']} />
            <SelectField label="Service" value={form.service_id} onChange={(value) => setForm({ ...form, service_id: value, required_scope_id: '' })} options={services.map((service) => ({ value: service.id, label: service.name }))} required />
            <Field label="Rewrite target" value={form.rewrite_target || ''} onChange={(value) => setForm({ ...form, rewrite_target: value })} placeholder="/api/products" />
            <SelectField
              label="Rate limit policy"
              value={form.rate_limit_id || ''}
              onChange={(value) => setForm({ ...form, rate_limit_id: value })}
              options={rateLimitPolicies.map((policy) => ({
                value: policy.id,
                label: `${policy.name} (${policy.max_requests}/${policy.window_seconds}s)`
              }))}
            />
            {canReadCorsPolicies && (
              <SelectField
                label="CORS policy"
                value={form.cors_policy_id || ''}
                onChange={(value) => setForm({ ...form, cors_policy_id: value })}
                options={corsPolicies.map((policy) => ({ value: policy.id, label: policy.name }))}
              />
            )}
            <SelectField
              label="Required API scope"
              value={form.required_scope_id || ''}
              onChange={(value) => setForm({ ...form, required_scope_id: value, auth_required: Boolean(value) || form.auth_required })}
              options={routeScopeOptions}
            />
            <Field label="Priority" type="number" value={form.priority} onChange={(value) => setForm({ ...form, priority: value })} />
            <Toggle label="Strip prefix" checked={form.strip_prefix} onChange={(value) => setForm({ ...form, strip_prefix: value })} />
            <Toggle label="Auth required" checked={form.auth_required} onChange={(value) => setForm({ ...form, auth_required: value, required_scope_id: value ? form.required_scope_id : '' })} />
            <Toggle label="Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
            <FormActions editing={editing} onCancel={onCancel} />
          </form>
        </Panel>
      )}

      <Panel title="Routes" eyebrow="GET /admin/routes">
        <table className="data-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Service</th>
              <th>Rewrite</th>
              <th>Auth / scope</th>
              <th>Policies</th>
              <th>Priority</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.id}>
                <td><strong><span className="method">{route.method}</span> {route.path}</strong><small>{route.id}</small></td>
                <td>{serviceName(route.service_id)}</td>
                <td>{route.rewrite_target || '-'}<small>{route.strip_prefix ? 'strip prefix' : 'keep prefix'}</small></td>
                <td>{route.auth_required ? 'required' : 'public'}<small>{scopeName(route.required_scope_id, apiScopes)}</small></td>
                <td>
                  <small>Rate: {policyName(route.rate_limit_id, rateLimitPolicies, 'none')}</small>
                  {canReadCorsPolicies && <small>CORS: {policyName(route.cors_policy_id, corsPolicies, 'none')}</small>}
                </td>
                <td>{route.priority}</td>
                <td><StatusPill active={route.is_active} label={route.is_active ? 'active' : 'inactive'} /></td>
                <td>
                  <RowActions
                    onInspect={() => onInspect(route)}
                    onEdit={canWrite ? () => onEdit(route) : undefined}
                    onDelete={canWrite ? () => onDelete(route) : undefined}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {routes.length === 0 && <EmptyState text="No routes found" />}
        <Pagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={onPageChange} />
      </Panel>
    </section>
  );
}

function scopeLabel(scope) {
  if (!scope) return '-';
  if (scope.code) return scope.code;
  if (scope.resource && scope.action) return `${scope.resource}:${scope.action}`;
  return scope.id || '-';
}

function scopeName(scopeId, scopes) {
  if (!scopeId) return '-';
  return scopeLabel(scopes.find((scope) => scope.id === scopeId)) || scopeId;
}

function policyName(id, policies, fallback) {
  if (!id) return fallback;
  return policies.find((policy) => policy.id === id)?.name || `${id.slice(0, 8)}...`;
}

function onlyIPPolicies(policies) {
  return (Array.isArray(policies) ? policies : []).filter((policy) => String(policy?.limit_type || '').toLowerCase() === 'ip');
}
