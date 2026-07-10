import React, { useEffect, useMemo, useState } from 'react';
import { Layers3, ListPlus } from 'lucide-react';
import { Alert, DetailModal, EmptyState, Field, FormActions, Pagination, Panel, RowActions, SelectField, StatusPill, Toggle } from '../components/common.jsx';
import { scrollToUpdateForm } from '../utils/scrollToUpdateForm.js';

const PAGE_SIZE = 5;
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const emptyAggregationForm = {
  name: '',
  path: '',
  method: 'GET',
  auth_required: true,
  required_scope_id: '',
  rate_limit_id: '',
  cors_policy_id: '',
  is_active: false
};

const emptyStepForm = {
  service_id: '',
  sequence: 1,
  depends_on: '',
  is_required: true,
  request_template: '{\n  "method": "GET",\n  "path": "/api/products"\n}',
  response_mapping: '{\n  "target": "products"\n}',
  is_active: true
};

export default function AggregationsPage({ api, services: shellServices = [] }) {
  const [aggregations, setAggregations] = useState([]);
  const [steps, setSteps] = useState([]);
  const [services, setServices] = useState(shellServices);
  const [rateLimits, setRateLimits] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [corsPolicies, setCorsPolicies] = useState([]);
  const [aggregationForm, setAggregationForm] = useState(emptyAggregationForm);
  const [stepForm, setStepForm] = useState(emptyStepForm);
  const [editingAggregationId, setEditingAggregationId] = useState('');
  const [editingStepId, setEditingStepId] = useState('');
  const [selectedAggregationId, setSelectedAggregationId] = useState('');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    loadInitial();
  }, [api]);

  useEffect(() => {
    if (shellServices.length) setServices(shellServices);
  }, [shellServices]);

  useEffect(() => {
    if (selectedAggregationId) loadSteps(selectedAggregationId);
    else setSteps([]);
  }, [selectedAggregationId]);

  async function loadInitial() {
    setLoading(true);
    setError('');
    try {
      const [aggregationList, serviceList, rateLimitList, apiKeyOptions, corsPolicyList] = await Promise.all([
        api.listAggregations(),
        api.listServices(),
        api.listRateLimitPolicies(),
        api.getAPIKeyOptions(),
        api.listCORSPolicies().catch(() => [])
      ]);
      setAggregations(aggregationList);
      setServices(serviceList);
      setRateLimits(onlyIPPolicies(rateLimitList));
      setScopes(apiKeyOptions.api_scopes || []);
      setCorsPolicies(corsPolicyList);
      if (!selectedAggregationId && aggregationList[0]) {
        setSelectedAggregationId(aggregationList[0].id);
      }
    } catch (err) {
      setError(err.message || 'Cannot load aggregations');
    } finally {
      setLoading(false);
    }
  }

  async function loadAggregations() {
    const list = await api.listAggregations();
    setAggregations(list);
    if (selectedAggregationId && !list.some((item) => item.id === selectedAggregationId)) {
      setSelectedAggregationId(list[0]?.id || '');
    }
    return list;
  }

  async function loadSteps(aggregationId) {
    setStepsLoading(true);
    setError('');
    try {
      const list = await api.listAggregationSteps(aggregationId);
      setSteps(list);
      if (!editingStepId) {
        setStepForm(nextStepForm(list));
      }
      return list;
    } catch (err) {
      setError(err.message || 'Cannot load aggregation steps');
      return [];
    } finally {
      setStepsLoading(false);
    }
  }

  async function submitAggregation(event) {
    event.preventDefault();
    setError('');
    const payload = aggregationPayload(aggregationForm);
    try {
      const saved = editingAggregationId
        ? await api.updateAggregation(editingAggregationId, payload)
        : await api.createAggregation(payload);
      setNotice(editingAggregationId ? 'Aggregation updated' : 'Aggregation created');
      cancelAggregationEdit();
      await loadAggregations();
      setSelectedAggregationId(saved.id);
    } catch (err) {
      setError(err.message || 'Cannot save aggregation');
    }
  }

  async function submitStep(event) {
    event.preventDefault();
    if (!selectedAggregationId) {
      setError('Choose an aggregation before adding steps');
      return;
    }
    setError('');
    try {
      const payload = stepPayload(stepForm);
      if (editingStepId) await api.updateAggregationStep(editingStepId, payload);
      else await api.createAggregationStep(selectedAggregationId, payload);
      setNotice(editingStepId ? 'Aggregation step updated' : 'Aggregation step created');
      setEditingStepId('');
      const freshSteps = await loadSteps(selectedAggregationId);
      setStepForm(nextStepForm(freshSteps));
    } catch (err) {
      setError(err.message || 'Cannot save aggregation step');
    }
  }

  function editAggregation(aggregation) {
    setEditingAggregationId(aggregation.id);
    setAggregationForm({
      name: aggregation.name,
      path: aggregation.path,
      method: aggregation.method,
      auth_required: aggregation.auth_required,
      required_scope_id: aggregation.required_scope_id || '',
      rate_limit_id: aggregation.rate_limit_id || '',
      cors_policy_id: aggregation.cors_policy_id || '',
      is_active: aggregation.is_active
    });
    scrollToUpdateForm();
  }

  function editStep(step) {
    setEditingStepId(step.id);
    setStepForm({
      service_id: step.service_id,
      sequence: step.sequence,
      depends_on: step.depends_on || '',
      is_required: step.is_required,
      request_template: stringifyJSON(step.request_template),
      response_mapping: stringifyJSON(step.response_mapping),
      is_active: step.is_active
    });
    scrollToUpdateForm('.aggregation-steps-panel');
  }

  function cancelAggregationEdit() {
    setEditingAggregationId('');
    setAggregationForm(emptyAggregationForm);
  }

  function cancelStepEdit() {
    setEditingStepId('');
    setStepForm(nextStepForm(steps));
  }

  async function removeAggregation(aggregation) {
    if (!window.confirm(`Delete aggregation ${aggregation.name}?`)) return;
    setError('');
    try {
      await api.deleteAggregation(aggregation.id);
      setNotice('Aggregation deleted');
      await loadAggregations();
    } catch (err) {
      setError(err.message || 'Cannot delete aggregation');
    }
  }

  async function removeStep(step) {
    const activeStepCount = steps.filter((item) => item.is_active).length;
    if (selectedAggregation?.is_active && step.is_active && activeStepCount <= 1) {
      setError('Cannot delete the last active step while this aggregation is active. Disable the aggregation first or add another active step.');
      return;
    }
    if (!window.confirm(`Delete step ${step.sequence}?`)) return;
    setError('');
    try {
      await api.deleteAggregationStep(step.id);
      setNotice('Aggregation step deleted');
      await loadSteps(selectedAggregationId);
    } catch (err) {
      setError(err.message || 'Cannot delete aggregation step');
    }
  }

  const selectedAggregation = aggregations.find((item) => item.id === selectedAggregationId);
  const stepOptions = steps
    .filter((step) => step.id !== editingStepId)
    .map((step) => ({ value: step.id, label: `#${step.sequence} ${serviceName(step.service_id, services)}` }));
  const paginated = useMemo(() => paginate(aggregations, page, PAGE_SIZE), [aggregations, page]);

  return (
    <section className="content-stack">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {notice && <Alert type="success" message={notice} onClose={() => setNotice('')} />}

      <Panel title={editingAggregationId ? 'Update aggregation' : 'Create aggregation'} eyebrow={editingAggregationId ? 'PUT /admin/aggregations/:id' : 'POST /admin/aggregations'}>
        <form className="form-grid" onSubmit={submitAggregation}>
          <Field label="Name" value={aggregationForm.name} onChange={(value) => setAggregationForm({ ...aggregationForm, name: value })} placeholder="dashboard-summary" required />
          <Field label="Gateway path" value={aggregationForm.path} onChange={(value) => setAggregationForm({ ...aggregationForm, path: value })} placeholder="/api/dashboard" required />
          <SelectField label="Method" value={aggregationForm.method} onChange={(value) => setAggregationForm({ ...aggregationForm, method: value })} options={METHODS} required />
          <SelectField
            label="Required scope"
            value={aggregationForm.required_scope_id}
            onChange={(value) => setAggregationForm({ ...aggregationForm, required_scope_id: value, auth_required: Boolean(value) || aggregationForm.auth_required })}
            options={scopes.map((scope) => ({ value: scope.id, label: scopeLabel(scope) }))}
          />
          <SelectField
            label="Rate limit"
            value={aggregationForm.rate_limit_id}
            onChange={(value) => setAggregationForm({ ...aggregationForm, rate_limit_id: value })}
            options={rateLimits.map((policy) => ({ value: policy.id, label: `${policy.name} (${policy.max_requests}/${policy.window_seconds}s)` }))}
          />
          <SelectField
            label="CORS policy"
            value={aggregationForm.cors_policy_id}
            onChange={(value) => setAggregationForm({ ...aggregationForm, cors_policy_id: value })}
            options={corsPolicies.map((policy) => ({ value: policy.id, label: policy.name }))}
          />
          <Toggle label="Auth required" checked={aggregationForm.auth_required} onChange={(value) => setAggregationForm({ ...aggregationForm, auth_required: value, required_scope_id: value ? aggregationForm.required_scope_id : '' })} />
          {editingAggregationId ? (
            <Toggle label="Active" checked={aggregationForm.is_active} onChange={(value) => setAggregationForm({ ...aggregationForm, is_active: value })} />
          ) : (
            <div className="form-hint">New aggregations start inactive. Add at least one active step before enabling.</div>
          )}
          <FormActions editing={Boolean(editingAggregationId)} onCancel={cancelAggregationEdit} />
        </form>
      </Panel>

      <Panel title="Aggregations" eyebrow="GET /admin/aggregations">
        <table className="data-table">
          <thead>
            <tr>
              <th>Aggregation</th>
              <th>Auth</th>
              <th>Scope</th>
              <th>Policies</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.items.map((aggregation) => (
              <tr key={aggregation.id} className={aggregation.id === selectedAggregationId ? 'selected-row' : ''}>
                <td>
                  <strong><span className="method">{aggregation.method}</span> {aggregation.path}</strong>
                  <small>{aggregation.name}</small>
                </td>
                <td>{aggregation.auth_required ? 'required' : 'public'}</td>
                <td>{scopeName(aggregation.required_scope_id, scopes)}</td>
                <td>
                  <small>{policyName(aggregation.rate_limit_id, rateLimits, 'No rate limit')}</small>
                  <small>{policyName(aggregation.cors_policy_id, corsPolicies, 'No CORS policy')}</small>
                </td>
                <td><StatusPill active={aggregation.is_active} label={aggregation.is_active ? 'active' : 'inactive'} /></td>
                <td>
                  <RowActions onInspect={() => setSelected({ title: 'Aggregation detail', record: aggregation })} onEdit={() => editAggregation(aggregation)} onDelete={() => removeAggregation(aggregation)}>
                    <button className="ghost-icon" type="button" onClick={() => setSelectedAggregationId(aggregation.id)} title="Manage steps">
                      <Layers3 size={16} />
                    </button>
                  </RowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && aggregations.length === 0 && <EmptyState text="No aggregations found" />}
        {loading && <EmptyState text="Loading aggregations..." />}
        <Pagination page={paginated.page} pageSize={PAGE_SIZE} totalItems={aggregations.length} onPageChange={setPage} />
      </Panel>

      <Panel title={selectedAggregation ? `Steps for ${selectedAggregation.name}` : 'Aggregation steps'} eyebrow="GET /admin/aggregations/:id/steps" className="aggregation-steps-panel">
        <div className="aggregation-step-toolbar">
          <SelectField
            label="Aggregation"
            value={selectedAggregationId}
            onChange={(value) => {
              setSelectedAggregationId(value);
              setEditingStepId('');
              setStepForm(emptyStepForm);
            }}
            options={aggregations.map((item) => ({ value: item.id, label: `${item.method} ${item.path}` }))}
          />
          <button className="ghost-button" type="button" onClick={() => loadSteps(selectedAggregationId)} disabled={!selectedAggregationId}>
            <ListPlus size={17} />
            Reload steps
          </button>
        </div>

        <form className="form-grid aggregation-step-form" onSubmit={submitStep}>
          <SelectField label="Service" value={stepForm.service_id} onChange={(value) => setStepForm({ ...stepForm, service_id: value })} options={services.map((service) => ({ value: service.id, label: service.name }))} required />
          <Field label="Sequence" type="number" value={stepForm.sequence} onChange={(value) => setStepForm({ ...stepForm, sequence: value })} required />
          <SelectField label="Depends on" value={stepForm.depends_on} onChange={(value) => setStepForm({ ...stepForm, depends_on: value })} options={stepOptions} />
          <Toggle label="Required step" checked={stepForm.is_required} onChange={(value) => setStepForm({ ...stepForm, is_required: value })} />
          <Toggle label="Active step" checked={stepForm.is_active} onChange={(value) => setStepForm({ ...stepForm, is_active: value })} />
          <label className="field field-wide json-field">
            <span>Request template</span>
            <textarea value={stepForm.request_template} onChange={(event) => setStepForm({ ...stepForm, request_template: event.target.value })} spellCheck="false" required />
          </label>
          <label className="field field-wide json-field">
            <span>Response mapping</span>
            <textarea value={stepForm.response_mapping} onChange={(event) => setStepForm({ ...stepForm, response_mapping: event.target.value })} spellCheck="false" required />
          </label>
          <FormActions editing={Boolean(editingStepId)} onCancel={cancelStepEdit} />
        </form>

        <table className="data-table aggregation-steps-table">
          <thead>
            <tr>
              <th>Step</th>
              <th>Service</th>
              <th>Request</th>
              <th>Mapping</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step) => (
              <tr key={step.id}>
                <td><strong>#{step.sequence}</strong><small>{step.depends_on ? `depends on ${shortId(step.depends_on)}` : 'no dependency'}</small></td>
                <td>{serviceName(step.service_id, services)}</td>
                <td><code className="inline-code">{requestLabel(step.request_template)}</code></td>
                <td><code className="inline-code">{targetLabel(step.response_mapping)}</code></td>
                <td>
                  <StatusPill active={step.is_active} label={step.is_active ? 'active' : 'inactive'} />
                  <small>{step.is_required ? 'required' : 'optional'}</small>
                </td>
                <td>
                  <RowActions onInspect={() => setSelected({ title: 'Aggregation step detail', record: step })} onEdit={() => editStep(step)} onDelete={() => removeStep(step)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!stepsLoading && selectedAggregationId && steps.length === 0 && <EmptyState text="No steps configured for this aggregation" />}
        {stepsLoading && <EmptyState text="Loading aggregation steps..." />}
        {!selectedAggregationId && <EmptyState text="Choose an aggregation to manage steps" />}
      </Panel>

      {selected && <DetailModal title={selected.title} record={selected.record} onClose={() => setSelected(null)} />}
    </section>
  );
}

function aggregationPayload(form) {
  return {
    name: form.name.trim(),
    path: form.path.trim(),
    method: form.method,
    auth_required: Boolean(form.auth_required),
    required_scope_id: form.required_scope_id || null,
    rate_limit_id: form.rate_limit_id || null,
    cors_policy_id: form.cors_policy_id || null,
    is_active: Boolean(form.is_active)
  };
}

function stepPayload(form) {
  return {
    service_id: form.service_id,
    sequence: Number(form.sequence),
    depends_on: form.depends_on || null,
    is_required: Boolean(form.is_required),
    request_template: parseJSON(form.request_template, 'Request template'),
    response_mapping: parseJSON(form.response_mapping, 'Response mapping'),
    is_active: Boolean(form.is_active)
  };
}

function parseJSON(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

function stringifyJSON(value) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value || {}, null, 2);
}

function nextStepForm(steps) {
  const maxSequence = steps.reduce((max, step) => Math.max(max, Number(step.sequence) || 0), 0);
  return { ...emptyStepForm, sequence: maxSequence + 1 };
}

function paginate(items, requestedPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  return { page, items: items.slice((page - 1) * pageSize, page * pageSize) };
}

function serviceName(serviceId, services) {
  return services.find((service) => service.id === serviceId)?.name || serviceId || '-';
}

function scopeLabel(scope) {
  return `${scope.code || `${scope.resource}:${scope.action}`}${scope.service_id ? ` · ${shortId(scope.service_id)}` : ''}`;
}

function scopeName(scopeId, scopes) {
  if (!scopeId) return '-';
  const scope = scopes.find((item) => item.id === scopeId);
  return scope ? scopeLabel(scope) : shortId(scopeId);
}

function policyName(id, policies, fallback) {
  if (!id) return fallback;
  return policies.find((policy) => policy.id === id)?.name || shortId(id);
}

function shortId(id) {
  return id ? `${id.slice(0, 8)}...` : '-';
}

function requestLabel(template) {
  const value = typeof template === 'string' ? safeParse(template) : template;
  return `${value?.method || 'GET'} ${value?.path || '-'}`;
}

function targetLabel(mapping) {
  const value = typeof mapping === 'string' ? safeParse(mapping) : mapping;
  return value?.target || JSON.stringify(value || {});
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function onlyIPPolicies(policies) {
  return (Array.isArray(policies) ? policies : []).filter((policy) => String(policy?.limit_type || '').toLowerCase() === 'ip');
}
