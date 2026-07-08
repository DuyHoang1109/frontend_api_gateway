import React, { useState } from 'react';
import { ShieldCheck, Trash2, X } from 'lucide-react';
import { Alert, EmptyState, Field, FormActions, Pagination, Panel, RowActions, SelectField, StatusPill, Toggle } from '../components/common.jsx';

const HTTP_METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const HEADER_OPTIONS = [
  'Accept',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Content-Language',
  'Content-Type',
  'Origin',
  'X-API-Key',
  'X-Correlation-ID',
  'X-Requested-With'
];

const defaultCORSForm = {
  allowed_origins: 'http://localhost:5173',
  allowed_methods: 'GET',
  allowed_headers: ['Content-Type', 'Authorization', 'X-API-Key'],
  allow_credentials: false,
  max_age: 3600,
  is_active: true,
  created_at: '',
  updated_at: ''
};

export default function RoutesPage(props) {
  const { api, services, routes, form, setForm, editing, onSubmit, onCancel, onEdit, onDelete, onInspect, serviceName, page, pageSize, totalItems, onPageChange } = props;
  const [corsRoute, setCorsRoute] = useState(null);
  const [corsForm, setCorsForm] = useState(defaultCORSForm);
  const [corsExists, setCorsExists] = useState(false);
  const [corsLoading, setCorsLoading] = useState(false);
  const [corsMessage, setCorsMessage] = useState('');
  const [corsError, setCorsError] = useState('');
  const [corsHeaderQuery, setCorsHeaderQuery] = useState('');
  const [rateLimitPolicies, setRateLimitPolicies] = useState([]);
  const [apiScopes, setApiScopes] = useState([]);

  React.useEffect(() => {
    let active = true;
    Promise.allSettled([api.listRateLimitPolicies(), api.getAPIKeyOptions()])
      .then(([rateLimitsResult, apiKeyOptionsResult]) => {
        if (!active) return;
        setRateLimitPolicies(rateLimitsResult.status === 'fulfilled' ? rateLimitsResult.value : []);
        setApiScopes(apiKeyOptionsResult.status === 'fulfilled' ? (apiKeyOptionsResult.value.api_scopes || []) : []);
      });
    return () => { active = false; };
  }, [api]);

  const routeScopeOptions = apiScopes
    .filter((scope) => !form.service_id || scope.service_id === undefined || scope.service_id === form.service_id)
    .map((scope) => ({ value: scope.id, label: scopeLabel(scope) }));

  async function openCORS(route) {
    setCorsRoute(route);
    setCorsLoading(true);
    setCorsMessage('');
    setCorsError('');
    setCorsHeaderQuery('');
    const fallback = corsDefaultsForRoute(route);
    try {
      const config = await api.getRouteCORS(route.id);
      setCorsExists(true);
      setCorsForm(configToForm(config));
    } catch (error) {
      if (error.status === 404) {
        setCorsExists(false);
        setCorsForm(fallback);
      } else {
        setCorsError(error.message || 'Cannot load CORS config');
      }
    } finally {
      setCorsLoading(false);
    }
  }

  async function saveCORS(event) {
    event.preventDefault();
    setCorsLoading(true);
    setCorsMessage('');
    setCorsError('');
    try {
      const config = await api.upsertRouteCORS(corsRoute.id, formToPayload(corsForm));
      setCorsExists(true);
      setCorsForm(configToForm(config));
      setCorsMessage('CORS config saved and gateway cache reload requested');
    } catch (error) {
      setCorsError(error.message || 'Cannot save CORS config');
    } finally {
      setCorsLoading(false);
    }
  }

  async function removeCORS() {
    if (!window.confirm(`Delete CORS config for ${corsRoute.method} ${corsRoute.path}?`)) return;
    setCorsLoading(true);
    setCorsMessage('');
    setCorsError('');
    try {
      await api.deleteRouteCORS(corsRoute.id);
      setCorsExists(false);
      setCorsMessage('CORS config deleted and gateway cache reload requested');
      setCorsForm(corsDefaultsForRoute(corsRoute));
    } catch (error) {
      setCorsError(error.message || 'Cannot delete CORS config');
    } finally {
      setCorsLoading(false);
    }
  }

  function toggleCORSHeader(header) {
    setCorsForm((current) => ({
      ...current,
      allowed_headers: current.allowed_headers.includes(header)
        ? current.allowed_headers.filter((item) => item !== header)
        : [...current.allowed_headers, header]
    }));
  }

  return (
    <section className="content-stack">
      <Panel title={editing ? 'Update route' : 'Create route'} eyebrow="POST /admin/routes">
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

      <Panel title="Routes" eyebrow="GET /admin/routes">
        <table className="data-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Service</th>
              <th>Rewrite</th>
              <th>Strip</th>
              <th>Auth / scope</th>
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
                <td>{route.rewrite_target || '-'}</td>
                <td>{route.strip_prefix ? 'yes' : 'no'}</td>
                <td>{route.auth_required ? 'required' : 'public'}<small>{scopeName(route.required_scope_id, apiScopes)}</small></td>
                <td>{route.priority}</td>
                <td><StatusPill active={route.is_active} label={route.is_active ? 'active' : 'inactive'} /></td>
                <td>
                  <RowActions onInspect={() => onInspect(route)} onEdit={() => onEdit(route)} onDelete={() => onDelete(route)}>
                    <button className="ghost-icon" type="button" onClick={() => openCORS(route)} title="Configure CORS"><ShieldCheck size={16} /></button>
                  </RowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {routes.length === 0 && <EmptyState text="No routes found" />}
        <Pagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={onPageChange} />
      </Panel>

      {corsRoute && (
        <div className="modal-backdrop" onClick={() => setCorsRoute(null)}>
          <section className="detail-modal cors-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <small>PUT /admin/routes/:id/cors</small>
                <h2>CORS · {corsRoute.method} {corsRoute.path}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setCorsRoute(null)} title="Close CORS config"><X size={18} /></button>
            </div>
            <form className="form-grid cors-form" onSubmit={saveCORS}>
              {(corsError || corsMessage) && <Alert type={corsError ? 'error' : 'success'} message={corsError || corsMessage} onClose={() => { setCorsError(''); setCorsMessage(''); }} className="field-wide" />}
              <div className="cors-left-column">
                <label className="field cors-origins">
                  <span>Allowed origins (one per line)</span>
                  <textarea value={corsForm.allowed_origins} onChange={(event) => setCorsForm({ ...corsForm, allowed_origins: event.target.value })} placeholder="http://localhost:5173" required />
                </label>
                <SelectField
                  label="Allowed method"
                  value={corsForm.allowed_methods}
                  onChange={(value) => setCorsForm({ ...corsForm, allowed_methods: value })}
                  options={HTTP_METHOD_OPTIONS}
                  required
                />
              </div>
              <fieldset className="field cors-header-picker">
                <legend>Allowed headers</legend>
                <input
                  className="cors-header-search"
                  type="search"
                  value={corsHeaderQuery}
                  onChange={(event) => setCorsHeaderQuery(event.target.value)}
                  placeholder="Search header, e.g. Content-Type or X-API-Key"
                />
                {corsForm.allowed_headers.length > 0 && (
                  <div className="cors-selected-headers" aria-label="Selected headers">
                    {corsForm.allowed_headers.map((header) => (
                      <button key={header} type="button" onClick={() => toggleCORSHeader(header)} title={`Remove ${header}`}>
                        <code>{header}</code><X size={12} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="cors-header-options">
                  {filteredHeadersFor(corsForm.allowed_headers, corsHeaderQuery).map((header) => (
                    <label key={header}>
                      <input
                        type="checkbox"
                        checked={corsForm.allowed_headers.includes(header)}
                        onChange={() => toggleCORSHeader(header)}
                      />
                      <code>{header}</code>
                    </label>
                  ))}
                  {filteredHeadersFor(corsForm.allowed_headers, corsHeaderQuery).length === 0 && <small>No headers match “{corsHeaderQuery}”</small>}
                </div>
              </fieldset>
              <Field label="Max age (seconds)" type="number" value={corsForm.max_age} onChange={(value) => setCorsForm({ ...corsForm, max_age: value })} required />
              <div className="cors-toggles">
                <Toggle label="Allow credentials" checked={corsForm.allow_credentials} onChange={(value) => setCorsForm({ ...corsForm, allow_credentials: value })} />
                <Toggle label="Active" checked={corsForm.is_active} onChange={(value) => setCorsForm({ ...corsForm, is_active: value })} />
              </div>
              {corsExists && (
                <div className="cors-meta field-wide">
                  <span>Created: {formatDate(corsForm.created_at)}</span>
                  <span>Updated: {formatDate(corsForm.updated_at)}</span>
                </div>
              )}
              <div className="form-actions field-wide">
                <button className="primary-button" type="submit" disabled={corsLoading}><ShieldCheck size={17} />{corsLoading ? 'Saving...' : corsExists ? 'Update CORS' : 'Create CORS'}</button>
                {corsExists && <button className="danger-button" type="button" onClick={removeCORS} disabled={corsLoading}><Trash2 size={17} />Delete CORS</button>}
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function splitLines(value) {
  return value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function corsDefaultsForRoute(route) {
  return {
    ...defaultCORSForm,
    allowed_headers: [...defaultCORSForm.allowed_headers],
    allowed_methods: HTTP_METHOD_OPTIONS.includes(route.method) ? route.method : 'GET'
  };
}

function formToPayload(form) {
  return {
    allowed_origins: splitLines(form.allowed_origins),
    allowed_methods: [form.allowed_methods],
    allowed_headers: form.allowed_headers,
    allow_credentials: Boolean(form.allow_credentials),
    max_age: Number(form.max_age),
    is_active: Boolean(form.is_active)
  };
}

function configToForm(config) {
  return {
    allowed_origins: (config.allowed_origins || []).join('\n'),
    allowed_methods: (config.allowed_methods || [])[0] || 'GET',
    allowed_headers: [...(config.allowed_headers || [])],
    allow_credentials: Boolean(config.allow_credentials),
    max_age: config.max_age ?? 3600,
    is_active: config.is_active !== false,
    created_at: config.created_at || '',
    updated_at: config.updated_at || ''
  };
}

function headerOptionsFor(selectedHeaders) {
  return [...new Set([...HEADER_OPTIONS, ...selectedHeaders])];
}

function filteredHeadersFor(selectedHeaders, query) {
  const normalizedQuery = query.trim().toLowerCase();
  const options = headerOptionsFor(selectedHeaders);
  return normalizedQuery ? options.filter((header) => header.toLowerCase().includes(normalizedQuery)) : options;
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

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '-';
}
